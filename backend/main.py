import os
import math
import logging
logging.basicConfig(level=logging.DEBUG)

import io
import csv as csv_module
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from io import BytesIO
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment

from db import Base, engine, get_db
from models import Tournament, Boat, RuleConfig, Race, RaceResult, Series, RankingProfile, User, TournamentMember
from schemas import (
    TournamentCreate,
    TournamentUpdate,
    TournamentOut,
    BoatCreate,
    BoatOut,
    RuleConfigUpdate,
    RuleConfigOut,
    RaceCreate,
    RaceUpdate,
    RaceOut,
    RaceResultInput,
    RaceResultOut,
    StandingRow,
    SeriesOut,
    RankingProfileOut,
    StandingSection,
    StandingsResponse,
    StandingsV3Response,
    UserOut,
    InviteRequest,
    InviteResponse,
    TournamentMemberOut,
    AddMemberRequest,
)
from auth import get_current_user, require_admin, check_tournament_access, get_supabase, AUTH_ENABLED

try:
    Base.metadata.create_all(bind=engine)
    print("[main] create_all OK", flush=True)
except Exception as e:
    print(f"[main] create_all FAILED: {type(e).__name__}: {e}", flush=True)

# カラム追加マイグレーション — 1文ずつ独立した try/except で囲み、
# 1つが失敗しても他のマイグレーションに影響しないようにする。
_MIGRATIONS = [
    "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS owner_id TEXT",
    "ALTER TABLE tournament_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'editor'",
    "ALTER TABLE boats ADD COLUMN IF NOT EXISTS entry_number INTEGER",
    "ALTER TABLE boats ADD COLUMN IF NOT EXISTS helmsman_name2 TEXT",
    "ALTER TABLE boats ADD COLUMN IF NOT EXISTS helmsman_name3 TEXT",
    "ALTER TABLE boats ADD COLUMN IF NOT EXISTS crew_name2 TEXT",
    "ALTER TABLE boats ADD COLUMN IF NOT EXISTS crew_name3 TEXT",
    # PostgreSQL専用: NOT NULL 制約を解除（SQLiteでは非対応だが本番はPostgreSQL）
    "ALTER TABLE boats ALTER COLUMN boat_number DROP NOT NULL",
    "ALTER TABLE boats ALTER COLUMN organization_name DROP NOT NULL",
    "ALTER TABLE races ADD COLUMN IF NOT EXISTS race_date TEXT",
    "ALTER TABLE races ADD COLUMN IF NOT EXISTS weather TEXT",
    "ALTER TABLE races ADD COLUMN IF NOT EXISTS wind_direction TEXT",
    "ALTER TABLE races ADD COLUMN IF NOT EXISTS wind_speed TEXT",
    "ALTER TABLE races ADD COLUMN IF NOT EXISTS start_time TEXT",
    "ALTER TABLE races ADD COLUMN IF NOT EXISTS finish_time_top TEXT",
    "ALTER TABLE races ADD COLUMN IF NOT EXISTS finish_time_last TEXT",
]

for _sql in _MIGRATIONS:
    try:
        with engine.connect() as _conn:
            _conn.execute(text(_sql))
            _conn.commit()
    except Exception as _e:
        print(f"[main] migration skip ({_e.__class__.__name__}): {_sql[:60]}", flush=True)

app = FastAPI()

# ALLOWED_ORIGINS 環境変数があればそれを使い、なければワイルドカードを許可
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
allow_origins_list = [o.strip() for o in _raw_origins.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins_list,
    allow_credentials=allow_origins_list != ["*"],
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization"],
)

def get_entries_count(tournament_id: int, db: Session) -> int:
    return db.query(Boat).filter(Boat.tournament_id == tournament_id).count()


def get_starters_count(payload: list[RaceResultInput]) -> int:
    non_starters = {"DNC", "DNS"}
    return sum(1 for item in payload if item.result_code not in non_starters)


def apply_scoring_rule(rule_name: str, entries_count: int, starters_count: int) -> int:
    if rule_name == "STARTERS_PLUS_1":
        return starters_count + 1
    if rule_name == "ENTRIES_PLUS_1":
        return entries_count + 1

    raise HTTPException(status_code=400, detail=f"Unknown scoring rule: {rule_name}")


def parse_class_config(class_config: str | None) -> list[str]:
    """
    "470,SNIPE"     -> ["470", "SNIPE"]
    "OTHER:ILCA"    -> ["OTHER:ILCA"]
    "470,OTHER:ILCA"-> ["470", "OTHER:ILCA"]
    None / ""       -> []
    """
    if not class_config:
        return []
    return [c.strip() for c in class_config.split(",") if c.strip()]


def class_display_name(entry: str) -> str:
    """class_config エントリをフィルタ用クラス名に変換する。
    "OTHER:ILCA" -> "ILCA", "470" -> "470"
    """
    if entry.startswith("OTHER:"):
        return entry[len("OTHER:"):]
    return entry


def calculate_points_for_result(
    item: RaceResultInput,
    rule_config: RuleConfig,
    entries_count: int,
    starters_count: int,
) -> int:
    code = item.result_code
    fp   = item.finish_position

    # 通常フィニッシュ
    if code == "OK":
        if fp is None:
            raise HTTPException(status_code=400, detail="OK result requires finish_position")
        return fp

    # 手動得点コード（RDG: 裁定による救済、DPI: 任意裁量ペナルティ）
    if code in ("RDG", "DPI"):
        return item.manual_points if item.manual_points is not None else 0

    # 標準ペナルティテーブルコード
    rule_map = {
        "DNC": rule_config.dnc_rule,   # 出場エリアに来なかった
        "DNS": rule_config.dns_rule,   # スタートしなかった
        "OCS": rule_config.ocs_rule,   # スタートライン越え
        "DNF": rule_config.dnf_rule,   # フィニッシュしなかった
        "RET": rule_config.ret_rule,   # リタイア
        "DSQ": rule_config.dsq_rule,   # 失格
        "UFD": rule_config.ufd_rule,   # Uフラッグ失格
        "BFD": rule_config.bfd_rule,   # 黒旗失格
        "NSC": rule_config.dsq_rule,   # コースを航走しなかった（DSQ同等）
        "DNE": rule_config.dsq_rule,   # 除外不能な失格（DSQ同等）
    }
    if code in rule_map:
        return apply_scoring_rule(rule_map[code], entries_count, starters_count)

    # 着順ベースのペナルティコード（fp 必須）
    if fp is None:
        raise HTTPException(status_code=400, detail=f"{code} requires finish_position")

    if code == "STP":                        # 標準ペナルティ +3点
        return fp + 3
    if code in ("SCP", "ARB", "PRP"):        # 各種ペナルティ ×1.3 切り上げ
        return math.ceil(fp * 1.3)
    if code == "ZFP":                        # 規則30.2 ×1.2 切り上げ
        return math.ceil(fp * 1.2)

    raise HTTPException(status_code=400, detail=f"Unsupported result_code: {code}")

def calculate_individual_standings(tournament_id: int, db: Session):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    boats = (
        db.query(Boat)
        .filter(Boat.tournament_id == tournament_id)
        .order_by(Boat.id.asc())
        .all()
    )

    races = (
        db.query(Race)
        .filter(Race.tournament_id == tournament_id)
        .order_by(Race.race_number.asc())
        .all()
    )

    rule_config = db.query(RuleConfig).filter(RuleConfig.tournament_id == tournament_id).first()
    if rule_config is None:
        raise HTTPException(status_code=404, detail="RuleConfig not found")

    results = (
        db.query(RaceResult)
        .join(Race, Race.id == RaceResult.race_id)
        .filter(Race.tournament_id == tournament_id)
        .all()
    )

    result_map = {}
    for result in results:
        result_map[(result.race_id, result.boat_id)] = result

    completed_races = len(races)

    standings = []
    for boat in boats:
        race_points = []
        valid_points = []

        for race in races:
            result = result_map.get((race.id, boat.id))
            if result is None or result.points is None:
                race_points.append(None)
            else:
                race_points.append(result.points)
                valid_points.append(result.points)

        total_points = sum(valid_points)

        discarded_points = []
        net_points = total_points

        if (
            rule_config.discard_enabled == 1
            and rule_config.discard_start_race_count is not None
            and rule_config.discard_count is not None
            and completed_races >= rule_config.discard_start_race_count
            and len(valid_points) > 0
        ):
            sorted_desc = sorted(valid_points, reverse=True)
            discarded_points = sorted_desc[: rule_config.discard_count]
            net_points = total_points - sum(discarded_points)

        standings.append(
            {
                "boat_id": boat.id,
                "boat_number": boat.boat_number,
                "sail_number": boat.sail_number,
                "organization_name": boat.organization_name,
                "race_points": race_points,
                "total_points": total_points,
                "discarded_points": discarded_points,
                "net_points": net_points,
                "rank": 0,
            }
        )

    standings.sort(key=lambda x: (x["net_points"], x["total_points"], x["boat_number"]))

    for i, row in enumerate(standings, start=1):
        row["rank"] = i

    return standings


def calculate_team_standings(tournament_id: int, db: Session, team_size: int):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    boats = (
        db.query(Boat)
        .filter(Boat.tournament_id == tournament_id)
        .order_by(Boat.id.asc())
        .all()
    )

    races = (
        db.query(Race)
        .filter(Race.tournament_id == tournament_id)
        .order_by(Race.race_number.asc())
        .all()
    )

    results = (
        db.query(RaceResult)
        .join(Race, Race.id == RaceResult.race_id)
        .filter(Race.tournament_id == tournament_id)
        .all()
    )

    boat_map = {boat.id: boat for boat in boats}

    # race_id ごとに team ごとの得点一覧をためる
    race_team_points = {}
    for race in races:
        race_team_points[race.id] = {}

    for result in results:
        if result.points is None:
            continue

        boat = boat_map.get(result.boat_id)
        if boat is None:
            continue

        team_name = boat.team_name if boat.team_name else boat.organization_name
        if not team_name:
            continue

        if team_name not in race_team_points[result.race_id]:
            race_team_points[result.race_id][team_name] = []

        race_team_points[result.race_id][team_name].append(result.points)

    standings = []
    all_team_names = set()

    for boat in boats:
        team_name = boat.team_name if boat.team_name else boat.organization_name
        if team_name:
            all_team_names.add(team_name)

    for team_name in sorted(all_team_names):
        race_points = []
        total_points = 0

        for race in races:
            points_list = race_team_points[race.id].get(team_name, [])
            points_list = sorted(points_list)

            adopted_points = sum(points_list[:team_size]) if len(points_list) > 0 else 0
            race_points.append(adopted_points)
            total_points += adopted_points

        standings.append(
            {
                "boat_id": 0,
                "boat_number": "",
                "sail_number": "",
                "organization_name": team_name,
                "race_points": race_points,
                "total_points": total_points,
                "discarded_points": [],
                "net_points": total_points,
                "rank": 0,
            }
        )

    standings.sort(key=lambda x: (x["net_points"], x["organization_name"]))

    for i, row in enumerate(standings, start=1):
        row["rank"] = i

    return standings


def calculate_multi_group_hybrid_standings(tournament_id: int, db: Session):
    raise HTTPException(status_code=501, detail="MULTI_GROUP_HYBRID standings not implemented yet")


def calculate_standings(tournament_id: int, db: Session):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.event_template == "INDIVIDUAL":
        return calculate_individual_standings(tournament_id, db)

    if tournament.event_template == "TEAM_3_BOATS":
        return calculate_team_standings(tournament_id, db, team_size=3)

    if tournament.event_template == "TEAM_4_BOATS":
        return calculate_team_standings(tournament_id, db, team_size=4)

    if tournament.event_template == "MULTI_GROUP_HYBRID":
        return calculate_multi_group_hybrid_standings(tournament_id, db)

    raise HTTPException(status_code=400, detail=f"Unsupported event_template: {tournament.event_template}")

def get_race_result_details_by_boat(tournament_id: int, db: Session):
    races = (
        db.query(Race)
        .filter(Race.tournament_id == tournament_id)
        .order_by(Race.race_number.asc())
        .all()
    )

    results = (
        db.query(RaceResult)
        .join(Race, Race.id == RaceResult.race_id)
        .filter(Race.tournament_id == tournament_id)
        .all()
    )

    result_map = {}
    for result in results:
        result_map[(result.race_id, result.boat_id)] = {
            "finish_position": result.finish_position,
            "result_code": result.result_code,
            "points": result.points,
        }

    return races, result_map

def build_standings_workbook(tournament_id: int, db: Session) -> Workbook:
    from openpyxl.utils import get_column_letter

    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    is_team = tournament.event_template in ("TEAM_3_BOATS", "TEAM_4_BOATS", "MULTI_GROUP_HYBRID")
    team_size = 4 if tournament.event_template == "TEAM_4_BOATS" else 3

    boats = (
        db.query(Boat)
        .filter(Boat.tournament_id == tournament_id)
        .order_by(Boat.id.asc())
        .all()
    )
    races, race_result_map = get_race_result_details_by_boat(tournament_id, db)
    boat_map = {b.id: b for b in boats}

    # ─── Styles ───────────────────────────────────────────────────────────────
    navy_fill   = PatternFill("solid", fgColor="1F4E78")
    gray_fill   = PatternFill("solid", fgColor="F0F4F8")
    hdr_font    = Font(color="FFFFFF", bold=True, size=9)
    bold9       = Font(bold=True, size=9)
    norm9       = Font(size=9)
    center_al   = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_al     = Alignment(horizontal="left",   vertical="center")
    right_al    = Alignment(horizontal="right",  vertical="center")

    thin   = Side(style="thin",   color="AAAAAA")
    medium = Side(style="medium", color="000000")

    def thin_border():
        return Border(left=thin, right=thin, top=thin, bottom=thin)

    def thick_top():
        return Border(left=thin, right=thin, top=medium, bottom=thin)

    def apply(cell, fill=None, font=None, alignment=None, border=None):
        if fill:      cell.fill      = fill
        if font:      cell.font      = font
        if alignment: cell.alignment = alignment
        if border:    cell.border    = border

    n_races    = len(races)
    n_fixed    = 7   # 順位 大学名 Entry艇体セールスキッパークルー
    n_tail     = 2 if is_team else 1
    total_cols = n_fixed + n_races * 3 + n_tail

    wb = Workbook()
    ws = wb.active
    ws.title = "成績"

    # ─── Row 1: title ─────────────────────────────────────────────────────────
    class_str = tournament.class_name or tournament.class_config or ""
    date_str  = ""
    if tournament.start_date:
        date_str = tournament.start_date
        if tournament.end_date and tournament.end_date != tournament.start_date:
            date_str += f"〜{tournament.end_date}"

    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=max(1, total_cols // 3))
    ws["A1"].value     = tournament.name
    ws["A1"].font      = Font(bold=True, size=13)
    ws["A1"].alignment = left_al

    mid_col = max(1, total_cols // 2)
    ws.merge_cells(start_row=1, start_column=mid_col, end_row=1, end_column=mid_col + 2)
    mc = ws.cell(row=1, column=mid_col, value=class_str)
    mc.font = Font(bold=True, size=12); mc.alignment = center_al

    ws.merge_cells(start_row=1, start_column=total_cols - 1, end_row=1, end_column=total_cols)
    ec = ws.cell(row=1, column=total_cols - 1, value=date_str)
    ec.font = Font(size=10); ec.alignment = right_al

    # Row 2 blank, Row 3 headers
    header_row = 3
    fixed_hdrs = ["順位", "大学名", "Entry\nNo.", "艇体\nNo.", "セール\nNo.", "スキッパー", "クルー"]
    for i, h in enumerate(fixed_hdrs, 1):
        c = ws.cell(row=header_row, column=i, value=h)
        apply(c, fill=navy_fill, font=hdr_font, alignment=center_al, border=thin_border())

    col = n_fixed + 1
    for race in races:
        rn = race.race_number
        for sub in (f"R{rn}\n着順", f"R{rn}\nコード", f"R{rn}\n得点"):
            c = ws.cell(row=header_row, column=col, value=sub)
            apply(c, fill=navy_fill, font=hdr_font, alignment=center_al, border=thin_border())
            col += 1

    if is_team:
        for h in ("艇合計", "大学合計"):
            c = ws.cell(row=header_row, column=col, value=h)
            apply(c, fill=navy_fill, font=hdr_font, alignment=center_al, border=thin_border())
            col += 1
    else:
        c = ws.cell(row=header_row, column=col, value="合計得点")
        apply(c, fill=navy_fill, font=hdr_font, alignment=center_al, border=thin_border())

    ws.row_dimensions[header_row].height = 28

    # ─── Data rows ────────────────────────────────────────────────────────────
    data_start = header_row + 1
    current_row = data_start

    def write_boat_row(ws, row, rank_val, univ_val, boat, races, race_result_map,
                       boat_total, team_total_val, is_team, is_first_in_team):
        bdr = thick_top() if is_first_in_team else thin_border()

        def wc(col, val, al=None, fnt=None):
            c = ws.cell(row=row, column=col, value=val)
            apply(c, font=fnt or norm9, alignment=al or left_al, border=bdr)

        wc(1, rank_val if rank_val != "" else "", center_al, bold9 if rank_val != "" else norm9)
        wc(2, univ_val, left_al)
        wc(3, boat.entry_number if boat.entry_number is not None else "", center_al)
        wc(4, boat.boat_number or "", center_al)
        wc(5, boat.sail_number or "", center_al)
        wc(6, boat.helmsman_name or "", left_al)
        wc(7, boat.crew_name or "", left_al)

        col = n_fixed + 1
        for race in races:
            detail = race_result_map.get((race.id, boat.id))
            if detail is None:
                for _ in range(3):
                    c = ws.cell(row=row, column=col, value="")
                    apply(c, font=norm9, alignment=center_al, border=bdr)
                    col += 1
            else:
                fp   = detail["finish_position"]
                code = detail["result_code"]
                pts  = detail["points"]
                disp_code = "" if code == "OK" else (code or "")
                c = ws.cell(row=row, column=col, value=fp if fp is not None else "")
                apply(c, font=norm9, alignment=center_al, border=bdr); col += 1
                c = ws.cell(row=row, column=col, value=disp_code)
                apply(c, font=norm9, alignment=center_al, border=bdr); col += 1
                c = ws.cell(row=row, column=col, value=pts if pts is not None else "")
                apply(c, font=norm9, alignment=center_al, border=bdr); col += 1

        if is_team:
            c = ws.cell(row=row, column=col, value=boat_total if boat_total is not None else "")
            apply(c, font=bold9, alignment=center_al, border=bdr); col += 1
            c = ws.cell(row=row, column=col, value=team_total_val)
            apply(c, font=bold9 if team_total_val != "" else norm9, alignment=center_al, border=bdr)
        else:
            c = ws.cell(row=row, column=col, value=boat_total if boat_total is not None else "")
            apply(c, font=bold9, alignment=center_al, border=bdr)

    if not is_team:
        # Individual standings
        standings = calculate_individual_standings(tournament_id, db)
        for item in standings:
            boat = boat_map.get(item["boat_id"])
            if boat is None:
                continue
            boat_total = item["net_points"]
            write_boat_row(ws, current_row, item["rank"], boat.organization_name or "",
                           boat, races, race_result_map,
                           boat_total, "", False, True)
            current_row += 1
    else:
        # Team standings — group boats by team, compute totals
        team_boats_map: dict[str, list] = {}
        for boat in boats:
            team = boat.team_name or boat.organization_name or "未設定"
            team_boats_map.setdefault(team, []).append(boat)

        def boat_total_pts(boat_id):
            return sum(
                (race_result_map.get((r.id, boat_id)) or {}).get("points") or 0
                for r in races
            )

        def team_total_pts(team_name):
            total = 0
            for race in races:
                pts_list = sorted(
                    p for b in team_boats_map[team_name]
                    if (p := (race_result_map.get((race.id, b.id)) or {}).get("points")) is not None
                )
                total += sum(pts_list[:team_size])
            return total

        sorted_teams = sorted(team_boats_map.keys(), key=team_total_pts)

        for rank, team_name in enumerate(sorted_teams, 1):
            t_total = team_total_pts(team_name)
            team_boat_list = team_boats_map[team_name]
            for i, boat in enumerate(team_boat_list):
                b_total = boat_total_pts(boat.id)
                rank_val  = rank      if i == 0 else ""
                univ_val  = team_name if i == 0 else ""
                team_val  = t_total   if i == 0 else ""
                write_boat_row(ws, current_row, rank_val, univ_val,
                               boat, races, race_result_map,
                               b_total, team_val, True, i == 0)
                current_row += 1

    # ─── Race info footer ─────────────────────────────────────────────────────
    footer_start = current_row + 2
    footer_labels = ["レース", "日付", "天気", "風向", "風速", "スタート", "Finish Top", "Finish Last"]
    label_col = 1

    for fi, label in enumerate(footer_labels):
        r = footer_start + fi
        c = ws.cell(row=r, column=label_col, value=label)
        apply(c, fill=navy_fill if fi == 0 else gray_fill,
              font=hdr_font if fi == 0 else bold9,
              alignment=center_al if fi == 0 else left_al,
              border=thin_border())

    for ri, race in enumerate(races):
        data_col = label_col + 1 + ri
        vals = [
            f"R{race.race_number}",
            getattr(race, "race_date", "") or "",
            getattr(race, "weather", "") or "",
            getattr(race, "wind_direction", "") or "",
            getattr(race, "wind_speed", "") or "",
            getattr(race, "start_time", "") or "",
            getattr(race, "finish_time_top", "") or "",
            getattr(race, "finish_time_last", "") or "",
        ]
        for fi, val in enumerate(vals):
            r = footer_start + fi
            c = ws.cell(row=r, column=data_col, value=val)
            apply(c, fill=navy_fill if fi == 0 else None,
                  font=hdr_font if fi == 0 else norm9,
                  alignment=center_al,
                  border=thin_border())

    # ─── Column widths ────────────────────────────────────────────────────────
    col_widths = {1: 5, 2: 18, 3: 7, 4: 7, 5: 10, 6: 13, 7: 13}
    for col_idx, width in col_widths.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    for ri in range(n_races):
        base = n_fixed + ri * 3
        ws.column_dimensions[get_column_letter(base + 1)].width = 5
        ws.column_dimensions[get_column_letter(base + 2)].width = 6
        ws.column_dimensions[get_column_letter(base + 3)].width = 6

    tail_base = n_fixed + n_races * 3
    ws.column_dimensions[get_column_letter(tail_base + 1)].width = 8
    if is_team:
        ws.column_dimensions[get_column_letter(tail_base + 2)].width = 9

    # freeze panes below header
    ws.freeze_panes = ws.cell(row=data_start, column=1)

    return wb

def create_default_series_and_profiles(tournament, db):
    template = tournament.event_template

    created_series = []
    created_profiles = []

    def add_series(name, display_name, scheduled_races=None, max_races_per_day=None,
                   discard_type="NONE", discard_after_races=None, discard_count=0):
        s = Series(
            tournament_id=tournament.id,
            name=name,
            display_name=display_name,
            scheduled_races=scheduled_races,
            max_races_per_day=max_races_per_day,
            discard_type=discard_type,
            discard_after_races=discard_after_races,
            discard_count=discard_count,
        )
        db.add(s)
        db.flush()
        created_series.append(s)
        return s

    def add_profile(series, name, display_name, ranking_unit, class_scope,
                    scoring_team_size, school_score_method,
                    include_open_in_finish_scoring=True,
                    include_open_in_series_ranking=True,
                    include_open_in_school_ranking=False,
                    target_group_tag=None):
        p = RankingProfile(
            tournament_id=tournament.id,
            series_id=series.id if series else None,
            name=name,
            display_name=display_name,
            ranking_unit=ranking_unit,
            class_scope=class_scope,
            scoring_team_size=scoring_team_size,
            school_score_method=school_score_method,
            include_open_in_finish_scoring=include_open_in_finish_scoring,
            include_open_in_series_ranking=include_open_in_series_ranking,
            include_open_in_school_ranking=include_open_in_school_ranking,
            target_group_tag=target_group_tag,
        )
        db.add(p)
        created_profiles.append(p)
        return p

    if template == "INDIVIDUAL":
        main = add_series("main", "本戦", discard_type="WORST_N_AFTER_RACES", discard_after_races=5, discard_count=1)
        add_profile(main, "individual_470", "470個人順位", "boat", "470", 1, "INDIVIDUAL")
        add_profile(main, "individual_snipe", "スナイプ個人順位", "boat", "SNIPE", 1, "INDIVIDUAL")

    elif template == "TEAM_3_BOATS":
        main = add_series("main", "本戦", discard_type="NONE", discard_count=0)
        add_profile(main, "team_470", "470団体順位", "team", "470", 3, "SUM_TOP_N", False, False, False)
        add_profile(main, "team_snipe", "スナイプ団体順位", "team", "SNIPE", 3, "SUM_TOP_N", False, False, False)
        add_profile(main, "team_overall", "総合順位", "team", "ALL", 3, "ALL_RACES_SUM", False, False, False)

    elif template == "TEAM_4_BOATS":
        main = add_series("main", "本戦", discard_type="NONE", discard_count=0)
        add_profile(main, "team_470", "470団体順位", "team", "470", 4, "SUM_TOP_N", False, False, False)
        add_profile(main, "team_snipe", "スナイプ団体順位", "team", "SNIPE", 4, "SUM_TOP_N", False, False, False)
        add_profile(main, "team_overall", "総合順位", "team", "ALL", 4, "ALL_RACES_SUM", False, False, False)

    elif template == "WOMENS_BEST1_PER_CLASS":
        women = add_series("women", "女子レース", discard_type="WORST_N_AFTER_RACES", discard_after_races=5, discard_count=1)
        add_profile(women, "women_470_individual", "470個人順位", "boat", "470", 1, "INDIVIDUAL", True, True, False)
        add_profile(women, "women_snipe_individual", "スナイプ個人順位", "boat", "SNIPE", 1, "INDIVIDUAL", True, True, False)
        add_profile(women, "women_school_overall", "女子学校総合", "team", "ALL", 1, "BEST_ONE_EACH_CLASS", True, False, False)

    elif template == "MULTI_GROUP_HYBRID":
        main = add_series("main", "本戦", discard_type="NONE", discard_count=0)
        add_profile(main, "godai_team", "五大学戦順位", "team", "ALL", 3, "ALL_RACES_SUM", False, False, False, "godai")
        add_profile(main, "rokudai_team", "六大学戦順位", "team", "ALL", 3, "ALL_RACES_SUM", False, False, False, "rokudai")
        add_profile(main, "overall_team", "全体学校順位", "team", "ALL", 3, "ALL_RACES_SUM", False, False, False, "overall")
        add_profile(main, "overall_individual_470", "470全体個人順位", "boat", "470", 1, "INDIVIDUAL", True, True, False)
        add_profile(main, "overall_individual_snipe", "スナイプ全体個人順位", "boat", "SNIPE", 1, "INDIVIDUAL", True, True, False)

    db. commit()

def calculate_team_standings_by_class(
    tournament_id: int,
    db: Session,
    team_size: int,
    boat_class: str | None,
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    boats_query = db.query(Boat).filter(Boat.tournament_id == tournament_id)

    if boat_class is not None and boat_class != "ALL":
        boats_query = boats_query.filter(Boat.boat_class == boat_class)

    boats = boats_query.order_by(Boat.id.asc()).all()

    races = (
        db.query(Race)
        .filter(Race.tournament_id == tournament_id)
        .order_by(Race.race_number.asc())
        .all()
    )

    if len(boats) == 0:
        return []

    boat_ids = [boat.id for boat in boats]

    results = (
        db.query(RaceResult)
        .filter(RaceResult.boat_id.in_(boat_ids))
        .join(Race, Race.id == RaceResult.race_id)
        .filter(Race.tournament_id == tournament_id)
        .all()
    )

    boat_map = {boat.id: boat for boat in boats}

    race_team_points = {race.id: {} for race in races}

    for result in results:
        if result.points is None:
            continue

        boat = boat_map.get(result.boat_id)
        if boat is None:
            continue

        team_name = boat.team_name if boat.team_name else boat.organization_name
        if not team_name:
            continue

        if team_name not in race_team_points[result.race_id]:
            race_team_points[result.race_id][team_name] = []

        race_team_points[result.race_id][team_name].append(result.points)

    all_team_names = set()
    for boat in boats:
        team_name = boat.team_name if boat.team_name else boat.organization_name
        if team_name:
            all_team_names.add(team_name)

    standings = []
    for team_name in sorted(all_team_names):
        race_points = []
        total_points = 0

        for race in races:
            points_list = race_team_points[race.id].get(team_name, [])
            points_list = sorted(points_list)

            adopted_points = sum(points_list[:team_size]) if len(points_list) > 0 else 0
            race_points.append(adopted_points)
            total_points += adopted_points

        standings.append(
            {
                "boat_id": 0,
                "boat_number": "",
                "sail_number": "",
                "organization_name": team_name,
                "race_points": race_points,
                "total_points": total_points,
                "discarded_points": [],
                "net_points": total_points,
                "rank": 0,
            }
        )

    standings.sort(key=lambda x: (x["net_points"], x["organization_name"]))

    for i, row in enumerate(standings, start=1):
        row["rank"] = i

    return standings

def calculate_team3_standings_sections(tournament_id: int, db: Session):
    return {
        "sections": [
            {
                "name": "470団体順位",
                "rows": calculate_team_standings_by_class(
                    tournament_id=tournament_id,
                    db=db,
                    team_size=3,
                    boat_class="470",
                ),
            },
            {
                "name": "スナイプ団体順位",
                "rows": calculate_team_standings_by_class(
                    tournament_id=tournament_id,
                    db=db,
                    team_size=3,
                    boat_class="SNIPE",
                ),
            },
            {
                "name": "総合順位",
                "rows": calculate_team_standings_by_class(
                    tournament_id=tournament_id,
                    db=db,
                    team_size=3,
                    boat_class=None,
                ),
            },
        ]
    }

def calculate_class_section_v3(
    tournament_id: int,
    db: Session,
    team_size: int,
    boat_class: str | None,
    section_title: str,
) -> dict:
    """
    指定クラスの帳票用セクションを構築する。
    返り値は ClassSection Pydantic モデルに対応する dict。
    """
    boats_query = db.query(Boat).filter(Boat.tournament_id == tournament_id)
    if boat_class is not None:
        boats_query = boats_query.filter(Boat.boat_class == boat_class)
    boats = boats_query.order_by(Boat.id.asc()).all()

    races = (
        db.query(Race)
        .filter(Race.tournament_id == tournament_id)
        .order_by(Race.race_number.asc())
        .all()
    )

    if len(boats) == 0:
        return {
            "class_name": boat_class or "ALL",
            "section_title": section_title,
            "race_count": len(races),
            "teams": [],
        }

    boat_ids = [boat.id for boat in boats]
    results = (
        db.query(RaceResult)
        .filter(RaceResult.boat_id.in_(boat_ids))
        .join(Race, Race.id == RaceResult.race_id)
        .filter(Race.tournament_id == tournament_id)
        .all()
    )
    result_map = {(r.race_id, r.boat_id): r for r in results}

    # カット設定を取得
    rule_config = db.query(RuleConfig).filter(RuleConfig.tournament_id == tournament_id).first()
    completed_races = len(races)
    discard_count = 0
    if (
        rule_config
        and rule_config.discard_enabled == 1
        and rule_config.discard_count is not None
        and rule_config.discard_count > 0
        and (
            rule_config.discard_start_race_count is None
            or completed_races >= rule_config.discard_start_race_count
        )
    ):
        discard_count = rule_config.discard_count

    # チームごとに艇をグループ化
    team_boats: dict[str, list] = {}
    for boat in boats:
        tname = boat.team_name if boat.team_name else boat.organization_name
        if not tname:
            continue
        team_boats.setdefault(tname, []).append(boat)

    team_blocks = []
    for tname in sorted(team_boats.keys()):
        boats_in_team = team_boats[tname]

        # 艇別明細
        boat_rows = []
        for boat in boats_in_team:
            race_points = []
            raw_total = 0
            for race in races:
                r = result_map.get((race.id, boat.id))
                pts = r.points if (r and r.points is not None) else None
                race_points.append(pts)
                if pts is not None:
                    raw_total += pts

            # カット対象レースを決定（得点が大きい順に discard_count 個）
            discarded_race_indices: list[int] = []
            if discard_count > 0:
                valid = [(i, p) for i, p in enumerate(race_points) if p is not None]
                worst = sorted(valid, key=lambda x: -x[1])[:discard_count]
                discarded_race_indices = [i for i, _ in worst]

            discarded_sum = sum(
                race_points[i] for i in discarded_race_indices if race_points[i] is not None
            )
            boat_total = raw_total - discarded_sum

            boat_rows.append({
                "boat_id": boat.id,
                "sail_number": boat.sail_number,
                "helmsman_name": boat.helmsman_name,
                "crew_name": boat.crew_name,
                "race_points": race_points,
                "boat_total": boat_total,
                "discarded_race_indices": discarded_race_indices,
            })

        # レースごとのチーム合計（上位 team_size 艇の合計）
        team_race_totals = []
        team_total = 0
        for race_idx in range(len(races)):
            per_race = sorted(
                row["race_points"][race_idx]
                for row in boat_rows
                if row["race_points"][race_idx] is not None
            )
            adopted = sum(per_race[:team_size])
            team_race_totals.append(adopted)
            team_total += adopted

        team_blocks.append({
            "team_name": tname,
            "boats": boat_rows,
            "team_race_totals": team_race_totals,
            "team_total": team_total,
            "rank": 0,
        })

    team_blocks.sort(key=lambda x: (x["team_total"], x["team_name"]))
    for i, block in enumerate(team_blocks, start=1):
        block["rank"] = i

    return {
        "class_name": boat_class or "ALL",
        "section_title": section_title,
        "race_count": len(races),
        "teams": team_blocks,
    }


def build_overall_section_v3(class_sections: list[dict]) -> dict:
    """
    複数クラスのセクションから総合順位セクションを構築する。
    """
    class_names = [s["class_name"] for s in class_sections]

    team_scores: dict[str, dict[str, int]] = {}
    for section in class_sections:
        cls_name = section["class_name"]
        for block in section["teams"]:
            tname = block["team_name"]
            team_scores.setdefault(tname, {})
            team_scores[tname][cls_name] = block["team_total"]

    overall_teams = []
    for tname in sorted(team_scores.keys()):
        class_scores = [
            {"class_name": cn, "points": team_scores[tname].get(cn, 0)}
            for cn in class_names
        ]
        total = sum(item["points"] for item in class_scores)
        overall_teams.append({
            "team_name": tname,
            "class_scores": class_scores,
            "total_points": total,
            "rank": 0,
        })

    overall_teams.sort(key=lambda x: (x["total_points"], x["team_name"]))
    for i, row in enumerate(overall_teams, start=1):
        row["rank"] = i

    return {
        "section_title": "総合順位",
        "teams": overall_teams,
    }


@app.get("/")
def read_root():
    return {"message": "Hello Sailing App"}

@app.get("/tournaments", response_model=list[TournamentOut])
def get_tournaments(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role == "admin":
        return db.query(Tournament).all()
    ids = [
        m.tournament_id
        for m in db.query(TournamentMember)
            .filter(TournamentMember.user_id == current_user.id)
            .all()
    ]
    return db.query(Tournament).filter(Tournament.id.in_(ids)).all()

@app.get("/tournaments/{tournament_id}", response_model=TournamentOut)
def get_tournament(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    check_tournament_access(tournament_id, current_user, db)
    return tournament

@app.post("/tournaments", response_model=TournamentOut)
def create_tournament(
    tournament: TournamentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    new_tournament = Tournament(**tournament.model_dump(), owner_id=current_user.id)
    db.add(new_tournament)
    db.flush()  # id を確定させてから tournament_members に追加

    # 作成者を owner として登録
    db.add(TournamentMember(
        tournament_id=new_tournament.id,
        user_id=current_user.id,
        role="owner",
    ))

    rule_config = RuleConfig(
        tournament_id=new_tournament.id,
        scheduled_races=1,
        minimum_races_for_series=1,
        discard_enabled=0,
        discard_start_race_count=None,
        discard_count=None,
        dnc_rule="ENTRIES_PLUS_1",
        dns_rule="ENTRIES_PLUS_1",
        ocs_rule="STARTERS_PLUS_1",
        dnf_rule="STARTERS_PLUS_1",
        ret_rule="STARTERS_PLUS_1",
        dsq_rule="STARTERS_PLUS_1",
        ufd_rule="ENTRIES_PLUS_1",
        bfd_rule="ENTRIES_PLUS_1",
    )
    db.add(rule_config)

    create_default_series_and_profiles(new_tournament, db)

    db.commit()
    db.refresh(new_tournament)
    return new_tournament


@app.put("/tournaments/{tournament_id}", response_model=TournamentOut)
def update_tournament(
    tournament_id: int,
    body: TournamentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    check_tournament_access(tournament_id, current_user, db, owner_only=True)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(tournament, field, value)

    db.commit()
    db.refresh(tournament)
    return tournament


@app.get("/tournaments/{tournament_id}/series", response_model=list[SeriesOut])
def get_series(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    check_tournament_access(tournament_id, current_user, db)
    return (
        db.query(Series)
        .filter(Series.tournament_id == tournament_id)
        .order_by(Series.id.asc())
        .all()
    )


@app.get("/tournaments/{tournament_id}/ranking-profiles", response_model=list[RankingProfileOut])
def get_ranking_profiles(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    check_tournament_access(tournament_id, current_user, db)
    return (
        db.query(RankingProfile)
        .filter(RankingProfile.tournament_id == tournament_id)
        .order_by(RankingProfile.id.asc())
        .all()
    )

@app.get("/tournaments/{tournament_id}/members", response_model=list[TournamentMemberOut])
def list_tournament_members(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """大会メンバー一覧（owner/editor 本人または admin のみ）"""
    check_tournament_access(tournament_id, current_user, db)
    members = (
        db.query(TournamentMember)
        .filter(TournamentMember.tournament_id == tournament_id)
        .all()
    )
    result = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        result.append(TournamentMemberOut(
            user_id=m.user_id,
            email=u.email if u else "unknown",
            role=m.role,
        ))
    return result


@app.post("/tournaments/{tournament_id}/members", response_model=TournamentMemberOut)
def add_tournament_editor(
    tournament_id: int,
    body: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """メールアドレスで editor を追加（owner または admin のみ）"""
    check_tournament_access(tournament_id, current_user, db, owner_only=True)

    # ローカル users テーブルを検索
    target = db.query(User).filter(User.email == body.email).first()

    # ローカルに存在しない場合、Supabase auth を検索して自動登録
    # （サインアップ済みだが未ログインのユーザーへの対応）
    if target is None and AUTH_ENABLED:
        try:
            supabase = get_supabase()
            resp = supabase.auth.admin.list_users()
            users_list = resp if isinstance(resp, list) else getattr(resp, "users", [])
            sb_user = next(
                (u for u in users_list if (u.email or "").lower() == body.email.lower()),
                None,
            )
            if sb_user:
                target = User(id=sb_user.id, email=sb_user.email or body.email, role="member")
                db.add(target)
                db.flush()
        except Exception as e:
            print(f"[add_member] Supabase lookup error: {e}", flush=True)

    if target is None:
        raise HTTPException(
            status_code=404,
            detail=f"{body.email} のユーザーが見つかりません。先にサインアップしてください。",
        )

    existing = db.query(TournamentMember).filter(
        TournamentMember.tournament_id == tournament_id,
        TournamentMember.user_id == target.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="既にメンバーとして登録されています")

    db.add(TournamentMember(tournament_id=tournament_id, user_id=target.id, role="editor"))
    db.commit()
    return TournamentMemberOut(user_id=target.id, email=target.email, role="editor")


@app.get("/tournaments/{tournament_id}/boats", response_model=list[BoatOut])
def get_boats(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    check_tournament_access(tournament_id, current_user, db)
    return db.query(Boat).filter(Boat.tournament_id == tournament_id).all()


@app.post("/tournaments/{tournament_id}/boats/import")
async def import_boats_csv(
    tournament_id: int,
    file: UploadFile = File(...),
    boat_class: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """CSVファイルから艇を一括登録。sail_number が重複する行はスキップ。"""
    check_tournament_access(tournament_id, current_user, db)

    content = await file.read()
    for _enc in ("utf-8-sig", "cp932", "shift-jis", "utf-8"):
        try:
            text_data = content.decode(_enc)
            break
        except (UnicodeDecodeError, LookupError):
            continue
    else:
        text_data = content.decode("utf-8", errors="replace")

    reader = csv_module.DictReader(io.StringIO(text_data))

    imported = 0
    skipped = 0

    def _s(v: str | None) -> str | None:
        return v.strip() or None if v else None

    for row in reader:
        sail_number = (row.get("sail_number") or "").strip()
        if not sail_number:
            skipped += 1
            continue

        dup = db.query(Boat).filter(
            Boat.tournament_id == tournament_id,
            Boat.sail_number == sail_number,
        ).first()
        if dup:
            skipped += 1
            continue

        entry_raw = (row.get("entry_number") or "").strip()
        entry_num = int(entry_raw) if entry_raw.isdigit() else None

        resolved_class = boat_class or _s(row.get("boat_class"))

        db.add(Boat(
            tournament_id=tournament_id,
            entry_number=entry_num,
            boat_number=_s(row.get("boat_number")),
            sail_number=sail_number,
            organization_name=_s(row.get("organization_name")),
            helmsman_name=_s(row.get("helmsman_name")),
            helmsman_name2=_s(row.get("helmsman_name2")),
            helmsman_name3=_s(row.get("helmsman_name3")),
            crew_name=_s(row.get("crew_name")),
            crew_name2=_s(row.get("crew_name2")),
            crew_name3=_s(row.get("crew_name3")),
            boat_class=resolved_class,
            team_name=_s(row.get("team_name")),
        ))
        imported += 1

    db.commit()
    return {"imported": imported, "skipped": skipped}


@app.post("/tournaments/{tournament_id}/boats", response_model=BoatOut)
def create_boat(
    tournament_id: int,
    boat: BoatCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    check_tournament_access(tournament_id, current_user, db)
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    new_boat = Boat(tournament_id=tournament_id, **boat.model_dump())
    db.add(new_boat)
    db.commit()
    db.refresh(new_boat)
    return new_boat


@app.get("/tournaments/{tournament_id}/rules", response_model=RuleConfigOut)
def get_rule_config(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    check_tournament_access(tournament_id, current_user, db)

    rule_config = db.query(RuleConfig).filter(RuleConfig.tournament_id == tournament_id).first()

    if rule_config is None:
        rule_config = RuleConfig(
            tournament_id=tournament_id,
            scheduled_races=1,
            minimum_races_for_series=1,
            discard_enabled=0,
            discard_start_race_count=None,
            discard_count=None,
            dnc_rule="ENTRIES_PLUS_1",
            dns_rule="ENTRIES_PLUS_1",
            ocs_rule="STARTERS_PLUS_1",
            dnf_rule="STARTERS_PLUS_1",
            ret_rule="STARTERS_PLUS_1",
            dsq_rule="STARTERS_PLUS_1",
            ufd_rule="ENTRIES_PLUS_1",
            bfd_rule="ENTRIES_PLUS_1",
        )
        db.add(rule_config)
        db.commit()
        db.refresh(rule_config)

    return rule_config


@app.put("/tournaments/{tournament_id}/rules", response_model=RuleConfigOut)
def update_rule_config(
    tournament_id: int,
    payload: RuleConfigUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    check_tournament_access(tournament_id, current_user, db)
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    rule_config = db.query(RuleConfig).filter(RuleConfig.tournament_id == tournament_id).first()

    if rule_config is None:
        rule_config = RuleConfig(tournament_id=tournament_id)
        db.add(rule_config)

    data = payload.model_dump()

    for key, value in data.items():
        if key == "discard_enabled":
            setattr(rule_config, key, 1 if value else 0)
        else:
            setattr(rule_config, key, value)

    db.commit()
    db.refresh(rule_config)
    return rule_config

@app.get("/tournaments/{tournament_id}/races", response_model=list[RaceOut])
def get_races(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    check_tournament_access(tournament_id, current_user, db)
    races = (
        db.query(Race)
        .filter(Race.tournament_id == tournament_id)
        .order_by(Race.race_number.asc())
        .all()
    )
    return races


@app.post("/tournaments/{tournament_id}/races", response_model=RaceOut)
def create_race(
    tournament_id: int,
    race: RaceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    check_tournament_access(tournament_id, current_user, db)
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    existing = (
        db.query(Race)
        .filter(Race.tournament_id == tournament_id, Race.race_number == race.race_number)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Race number already exists")

    new_race = Race(
        tournament_id=tournament_id,
        race_number=race.race_number,
        name=race.name,
        status=race.status,
    )
    db.add(new_race)
    db.commit()
    db.refresh(new_race)
    return new_race

@app.put("/races/{race_id}", response_model=RaceOut)
def update_race(
    race_id: int,
    body: RaceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    race = db.query(Race).filter(Race.id == race_id).first()
    if race is None:
        raise HTTPException(status_code=404, detail="Race not found")
    check_tournament_access(race.tournament_id, current_user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(race, field, value)
    db.commit()
    db.refresh(race)
    return race

@app.get("/races/{race_id}/results", response_model=list[RaceResultOut])
def get_race_results(race_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    race = db.query(Race).filter(Race.id == race_id).first()
    if race is None:
        raise HTTPException(status_code=404, detail="Race not found")
    check_tournament_access(race.tournament_id, current_user, db)
    results = (
        db.query(RaceResult)
        .filter(RaceResult.race_id == race_id)
        .order_by(RaceResult.id.asc())
        .all()
    )
    return results

@app.put("/races/{race_id}/results", response_model=list[RaceResultOut])
def save_race_results(
    race_id: int,
    payload: list[RaceResultInput],
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    race = db.query(Race).filter(Race.id == race_id).first()
    if race is None:
        raise HTTPException(status_code=404, detail="Race not found")

    tournament = db.query(Tournament).filter(Tournament.id == race.tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    check_tournament_access(tournament.id, current_user, db)

    rule_config = db.query(RuleConfig).filter(RuleConfig.tournament_id == tournament.id).first()
    if rule_config is None:
        raise HTTPException(status_code=404, detail="RuleConfig not found")

    entries_count = get_entries_count(tournament.id, db)
    starters_count = get_starters_count(payload)

    ok_positions = [item.finish_position for item in payload if item.result_code == "OK"]
    ok_positions = [p for p in ok_positions if p is not None]

    if len(ok_positions) != len(set(ok_positions)):
        raise HTTPException(status_code=400, detail="Duplicate finish_position detected among OK results")

    db.query(RaceResult).filter(RaceResult.race_id == race_id).delete()

    new_results = []
    for item in payload:
        points = calculate_points_for_result(
            item=item,
            rule_config=rule_config,
            entries_count=entries_count,
            starters_count=starters_count,
        )

        new_result = RaceResult(
            race_id=race_id,
            boat_id=item.boat_id,
            finish_position=item.finish_position,
            result_code=item.result_code,
            points=points,
            note=item.note,
        )
        db.add(new_result)
        new_results.append(new_result)

    db.commit()

    for result in new_results:
        db.refresh(result)

    return new_results

@app.get("/tournaments/{tournament_id}/standings", response_model=list[StandingRow])
def get_standings(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    check_tournament_access(tournament_id, current_user, db)
    return calculate_standings(tournament_id, db)

@app.get("/tournaments/{tournament_id}/standings-v2", response_model=StandingsResponse)
def get_standings_v2(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    check_tournament_access(tournament_id, current_user, db)

    if tournament.event_template == "TEAM_3_BOATS":
        return calculate_team3_standings_sections(tournament_id, db)

    if tournament.event_template == "INDIVIDUAL":
        return {
            "sections": [
                {
                    "name": "総合順位",
                    "rows": calculate_individual_standings(tournament_id, db),
                }
            ]
        }

    if tournament.event_template == "TEAM_4_BOATS":
        return {
            "sections": [
                {
                    "name": "総合順位",
                    "rows": calculate_team_standings_by_class(
                        tournament_id=tournament_id,
                        db=db,
                        team_size=4,
                        boat_class=None,
                    ),
                }
            ]
        }

    raise HTTPException(status_code=501, detail="standings-v2 not implemented for this event_template yet")

@app.get("/tournaments/{tournament_id}/standings-v3", response_model=StandingsV3Response)
def get_standings_v3(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    check_tournament_access(tournament_id, current_user, db)

    if tournament.event_template != "TEAM_3_BOATS":
        raise HTTPException(status_code=501, detail="standings-v3 is only implemented for TEAM_3_BOATS")

    team_size = 3
    classes = parse_class_config(tournament.class_config)

    class_sections = []
    if classes:
        for entry in classes:
            display = class_display_name(entry)
            section = calculate_class_section_v3(
                tournament_id=tournament_id,
                db=db,
                team_size=team_size,
                boat_class=display,
                section_title=f"{display}団体順位",
            )
            class_sections.append(section)
    else:
        # class_config 未設定時は全艇を1セクションとして扱う
        section = calculate_class_section_v3(
            tournament_id=tournament_id,
            db=db,
            team_size=team_size,
            boat_class=None,
            section_title="団体順位",
        )
        class_sections.append(section)

    overall_section = None
    if len(class_sections) > 1:
        overall_section = build_overall_section_v3(class_sections)

    return {
        "event_template": tournament.event_template,
        "class_sections": class_sections,
        "overall_section": overall_section,
    }

@app.get("/tournaments/{tournament_id}/export/excel")
def export_excel(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    check_tournament_access(tournament_id, current_user, db)
    wb = build_standings_workbook(tournament_id, db)

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    filename = f"tournament_{tournament_id}_standings.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )

@app.post("/tournaments/{tournament_id}/seed/team3-demo")
def seed_team3_demo(tournament_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    check_tournament_access(tournament_id, current_user, db, owner_only=True)
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.event_template != "TEAM_3_BOATS":
        raise HTTPException(status_code=400, detail="This seed is only for TEAM_3_BOATS tournaments")

    rule_config = db.query(RuleConfig).filter(RuleConfig.tournament_id == tournament_id).first()
    if rule_config is None:
        rule_config = RuleConfig(
            tournament_id=tournament_id,
            scheduled_races=1,
            minimum_races_for_series=1,
            discard_enabled=0,
            discard_start_race_count=None,
            discard_count=None,
            dnc_rule="ENTRIES_PLUS_1",
            dns_rule="ENTRIES_PLUS_1",
            ocs_rule="STARTERS_PLUS_1",
            dnf_rule="STARTERS_PLUS_1",
            ret_rule="STARTERS_PLUS_1",
            dsq_rule="STARTERS_PLUS_1",
            ufd_rule="ENTRIES_PLUS_1",
            bfd_rule="ENTRIES_PLUS_1",
        )
        db.add(rule_config)
        db.flush()

    existing_boats = db.query(Boat).filter(Boat.tournament_id == tournament_id).count()
    if existing_boats == 0:
        demo_boats = [
            Boat(tournament_id=tournament_id, boat_number="1", sail_number="A1", organization_name="A大学", team_name="A大学", boat_class="470", helmsman_name="A1", crew_name="A1c"),
            Boat(tournament_id=tournament_id, boat_number="2", sail_number="A2", organization_name="A大学", team_name="A大学", boat_class="470", helmsman_name="A2", crew_name="A2c"),
            Boat(tournament_id=tournament_id, boat_number="3", sail_number="A3", organization_name="A大学", team_name="A大学", boat_class="470", helmsman_name="A3", crew_name="A3c"),
            Boat(tournament_id=tournament_id, boat_number="4", sail_number="B1", organization_name="B大学", team_name="B大学", boat_class="470", helmsman_name="B1", crew_name="B1c"),
            Boat(tournament_id=tournament_id, boat_number="5", sail_number="B2", organization_name="B大学", team_name="B大学", boat_class="470", helmsman_name="B2", crew_name="B2c"),
            Boat(tournament_id=tournament_id, boat_number="6", sail_number="B3", organization_name="B大学", team_name="B大学", boat_class="470", helmsman_name="B3", crew_name="B3c"),
        ]
        db.add_all(demo_boats)
        db.flush()

    boats = (
        db.query(Boat)
        .filter(Boat.tournament_id == tournament_id)
        .order_by(Boat.id.asc())
        .all()
    )

    race = (
        db.query(Race)
        .filter(Race.tournament_id == tournament_id, Race.race_number == 1)
        .first()
    )
    if race is None:
        race = Race(
            tournament_id=tournament_id,
            race_number=1,
            name="Race 1",
            status="CONFIRMED",
        )
        db.add(race)
        db.flush()

    existing_results = db.query(RaceResult).filter(RaceResult.race_id == race.id).count()
    if existing_results == 0:
        for i, boat in enumerate(boats[:6], start=1):
            db.add(
                RaceResult(
                    race_id=race.id,
                    boat_id=boat.id,
                    finish_position=i,
                    result_code="OK",
                    points=i,
                    note=None,
                )
            )

    db.commit()

    return {
        "message": "team3 demo seeded",
        "tournament_id": tournament_id,
        "race_id": race.id,
        "boat_count": len(boats),
    }


# ─── 認証・管理者エンドポイント ────────────────────────────────────────────

@app.post("/admin/bootstrap")
def bootstrap_admin(db: Session = Depends(get_db)):
    """
    初回セットアップ用：BOOTSTRAP_ADMIN_EMAIL のユーザーを admin に昇格する。
    - BOOTSTRAP_ADMIN_EMAIL 環境変数が未設定なら 400
    - 既に admin ユーザーが存在すれば 409（二重実行防止）
    - 対象メールのユーザーが users テーブルに未登録なら 404
    """
    email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="BOOTSTRAP_ADMIN_EMAIL 環境変数が設定されていません")

    existing_admin = db.query(User).filter(User.role == "admin").first()
    if existing_admin:
        raise HTTPException(status_code=409, detail="管理者ユーザーが既に存在します（二重実行防止）")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=404,
            detail=f"{email} のユーザーレコードが見つかりません。先に一度ログインしてください。",
        )

    user.role = "admin"
    db.commit()
    return {"message": f"{email} を admin に昇格しました", "user_id": user.id}


@app.get("/auth/me", response_model=UserOut)
def get_me(current_user=Depends(get_current_user)):
    """ログイン中のユーザー情報を返す"""
    return current_user


@app.get("/admin/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    """全ユーザー一覧（管理者のみ）"""
    return db.query(User).order_by(User.email).all()


@app.post("/admin/invite", response_model=InviteResponse)
def invite_user(
    body: InviteRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """メールで招待を送り、usersテーブルに登録する（管理者のみ）"""
    if not AUTH_ENABLED:
        raise HTTPException(status_code=503, detail="認証が無効です（SUPABASE_URL 未設定）")

    try:
        supabase = get_supabase()
        resp = supabase.auth.admin.invite_user_by_email(body.email)
        sb_user = resp.user
        if sb_user is None:
            raise HTTPException(status_code=500, detail="Supabase 招待に失敗しました")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"招待エラー: {e}")

    # users テーブルに登録（既存なら role だけ更新）
    user = db.query(User).filter(User.id == sb_user.id).first()
    if user is None:
        user = User(id=sb_user.id, email=body.email, role=body.role)
        db.add(user)
    else:
        user.role = body.role

    # member の場合は担当大会を登録
    if body.role == "member":
        for tid in body.tournament_ids:
            exists = db.query(TournamentMember).filter(
                TournamentMember.tournament_id == tid,
                TournamentMember.user_id == sb_user.id,
            ).first()
            if not exists:
                db.add(TournamentMember(tournament_id=tid, user_id=sb_user.id))

    db.commit()
    return InviteResponse(message="招待メールを送信しました", email=body.email, role=body.role)


@app.put("/admin/users/{user_id}/role")
def update_user_role(
    user_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """ユーザーの role を admin ↔ member 切り替え（管理者のみ）。自分自身は変更不可。"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="自分自身の権限は変更できません")

    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    target.role = "member" if target.role == "admin" else "admin"
    db.commit()
    return {"id": target.id, "email": target.email, "role": target.role}


@app.post("/admin/users/{user_id}/tournaments/{tournament_id}")
def add_tournament_member(
    user_id: str,
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """ユーザーに担当大会を追加（管理者のみ）"""
    exists = db.query(TournamentMember).filter(
        TournamentMember.tournament_id == tournament_id,
        TournamentMember.user_id == user_id,
    ).first()
    if not exists:
        db.add(TournamentMember(tournament_id=tournament_id, user_id=user_id))
        db.commit()
    return {"message": "追加しました"}
