from pydantic import BaseModel, model_validator
from typing import Optional, List

class TournamentCreate(BaseModel):
    name: str
    short_name: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    venue: str | None = None
    organizer: str | None = None
    class_name: str | None = None
    class_config: str | None = None
    event_template: str = "INDIVIDUAL"
    notes: str | None = None


class TournamentUpdate(BaseModel):
    name: str | None = None
    short_name: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    venue: str | None = None
    organizer: str | None = None
    class_name: str | None = None
    class_config: str | None = None
    event_template: str | None = None
    notes: str | None = None



class TournamentOut(BaseModel):
    id: int
    name: str
    short_name: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    venue: str | None = None
    organizer: str | None = None
    class_name: str | None = None
    class_config: str | None = None
    event_template: str
    notes: str | None = None
    owner_id: str | None = None
    deleted_at: str | None = None

    class Config:
        from_attributes = True

class SeriesOut(BaseModel):
    id: int
    tournament_id: int
    name: str
    display_name: str
    scheduled_races: Optional[int] = None
    max_races_per_day: Optional[int] = None
    discard_type: str
    discard_after_races: Optional[int] = None
    discard_count: int

    class Config:
        from_attributes = True


class RankingProfileOut(BaseModel):
    id: int
    tournament_id: int
    series_id: Optional[int] = None
    name: str
    display_name: str
    ranking_unit: str
    class_scope: str
    scoring_team_size: int
    school_score_method: str
    include_open_in_finish_scoring: bool
    include_open_in_series_ranking: bool
    include_open_in_school_ranking: bool
    target_group_tag: Optional[str] = None

    class Config:
        from_attributes = True


class BoatCreate(BaseModel):
    entry_number: Optional[int] = None
    boat_number: Optional[str] = None
    sail_number: Optional[str] = None
    organization_name: Optional[str] = None
    helmsman_name: Optional[str] = None
    helmsman_name2: Optional[str] = None
    helmsman_name3: Optional[str] = None
    crew_name: Optional[str] = None
    crew_name2: Optional[str] = None
    crew_name3: Optional[str] = None
    series_id: Optional[int] = None
    boat_class: Optional[str] = None
    team_name: Optional[str] = None
    is_open_entry: bool = False
    is_team_scoring_target: bool = True
    is_individual_scoring_target: bool = True
    group_tags: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def require_entry_or_sail(self) -> "BoatCreate":
        has_sail = bool(self.sail_number and self.sail_number.strip())
        has_entry = self.entry_number is not None
        if not has_sail and not has_entry:
            raise ValueError("entry_number または sail_number のどちらか一方は必須です")
        return self


class BoatOut(BaseModel):
    id: int
    tournament_id: int
    entry_number: int | None = None
    boat_number: str | None = None
    sail_number: str
    organization_name: str | None = None
    helmsman_name: str | None = None
    helmsman_name2: str | None = None
    helmsman_name3: str | None = None
    crew_name: str | None = None
    crew_name2: str | None = None
    crew_name3: str | None = None

    series_id: Optional[int] = None
    boat_class: Optional[str] = None
    team_name: Optional[str] = None
    is_open_entry: bool
    is_team_scoring_target: bool
    is_individual_scoring_target: bool
    group_tags: Optional[str] = None

    notes: str | None = None

    class Config:
        from_attributes = True


class BoatBulkItem(BaseModel):
    id: Optional[int] = None
    entry_number: Optional[int] = None
    boat_number: Optional[str] = None
    sail_number: Optional[str] = None
    organization_name: Optional[str] = None
    helmsman_name: Optional[str] = None
    helmsman_name2: Optional[str] = None
    helmsman_name3: Optional[str] = None
    crew_name: Optional[str] = None
    crew_name2: Optional[str] = None
    crew_name3: Optional[str] = None
    boat_class: Optional[str] = None
    team_name: Optional[str] = None
    is_open_entry: bool = False
    is_team_scoring_target: bool = True
    is_individual_scoring_target: bool = True
    group_tags: Optional[str] = None
    notes: Optional[str] = None


class BoatBulkUpdate(BaseModel):
    boats: List[BoatBulkItem]
    deleted_ids: List[int] = []


class RuleConfigUpdate(BaseModel):
    scheduled_races: int
    minimum_races_for_series: int
    discard_enabled: bool
    discard_start_race_count: int | None = None
    discard_count: int | None = None
    dnc_rule: str
    dns_rule: str
    ocs_rule: str
    dnf_rule: str
    ret_rule: str
    dsq_rule: str
    ufd_rule: str
    bfd_rule: str
    nsc_rule: str = "STARTERS_PLUS_1"
    dne_rule: str = "STARTERS_PLUS_1"
    custom_result_codes: Optional[str] = None
    team_cut_method: str = "individual"
    overall_tie_method: str = "kanto"
    tie_fallback_extended: bool = True
    tie_use_excluded_scores: bool = True
    dne_score_method: str = "plus_one"
    sp_method: str = "dsq"
    use_appendix_t: bool = True
    same_school_rule: bool = False
    min_races_to_complete: int = 1
    fleet_split: bool = False
    fleet_split_method: str = "own"
    preset_template: str = "custom"
    stp_penalty_points: float = 3.0
    scp_multiplier: float = 1.3
    arb_multiplier: float = 1.3
    prp_multiplier: float = 1.3
    zfp_multiplier: float = 1.2


class RuleConfigOut(BaseModel):
    id: int
    tournament_id: int
    scheduled_races: int
    minimum_races_for_series: int
    discard_enabled: int
    discard_start_race_count: int | None = None
    discard_count: int | None = None
    dnc_rule: str
    dns_rule: str
    ocs_rule: str
    dnf_rule: str
    ret_rule: str
    dsq_rule: str
    ufd_rule: str
    bfd_rule: str
    nsc_rule: str = "STARTERS_PLUS_1"
    dne_rule: str = "STARTERS_PLUS_1"
    custom_result_codes: Optional[str] = None
    team_cut_method: str = "individual"
    overall_tie_method: str = "kanto"
    tie_fallback_extended: bool = True
    tie_use_excluded_scores: bool = True
    dne_score_method: str = "plus_one"
    sp_method: str = "dsq"
    use_appendix_t: bool = True
    same_school_rule: bool = False
    min_races_to_complete: int = 1
    fleet_split: bool = False
    fleet_split_method: str = "own"
    preset_template: str = "custom"
    stp_penalty_points: float = 3.0
    scp_multiplier: float = 1.3
    arb_multiplier: float = 1.3
    prp_multiplier: float = 1.3
    zfp_multiplier: float = 1.2

    class Config:
        from_attributes = True

class RaceCreate(BaseModel):
    race_number: int
    name: str | None = None
    status: str = "DRAFT"


class RaceUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    race_date: str | None = None
    weather: str | None = None
    wind_direction: str | None = None
    wind_speed: str | None = None
    start_time: str | None = None
    finish_time_top: str | None = None
    finish_time_last: str | None = None


class RaceOut(BaseModel):
    id: int
    tournament_id: int
    race_number: int
    name: str | None = None
    status: str
    race_date: str | None = None
    weather: str | None = None
    wind_direction: str | None = None
    wind_speed: str | None = None
    start_time: str | None = None
    finish_time_top: str | None = None
    finish_time_last: str | None = None

    class Config:
        from_attributes = True

class RaceResultInput(BaseModel):
    boat_id: int
    finish_position: int | None = None
    result_code: str = "OK"
    note: str | None = None
    manual_points: int | None = None  # RDG / DPI 用手動得点
    manual_override_points: Optional[int] = None  # 得点上書き（任意コード）


class RaceResultOut(BaseModel):
    id: int
    race_id: int
    boat_id: int
    finish_position: int | None = None
    result_code: str
    points: int | None = None
    note: str | None = None

    class Config:
        from_attributes = True

class StandingRow(BaseModel):
    boat_id: int
    boat_number: str
    sail_number: str
    organization_name: str
    race_points: list[int | None]
    total_points: int
    discarded_points: list[int]
    net_points: int
    rank: int

class StandingSection(BaseModel):
    name: str
    rows: list[StandingRow]

class StandingsResponse(BaseModel):
    sections: list[StandingSection]


# --- V3 スキーマ (TEAM_3_BOATS 帳票用ネスト構造) ---

class BoatDetailRow(BaseModel):
    boat_id: int
    sail_number: str
    helmsman_name: str | None = None
    crew_name: str | None = None
    race_points: list[int | None]
    boat_total: int
    discarded_race_indices: list[int] = []

class TeamClassBlock(BaseModel):
    rank: int
    team_name: str
    team_race_totals: list[int | None]
    team_total: int
    boats: list[BoatDetailRow]
    team_discarded_race_indices: list[int] = []

class ClassSection(BaseModel):
    class_name: str
    section_title: str
    race_count: int
    teams: list[TeamClassBlock]
    cut_method: str = "individual"

class ClassScoreItem(BaseModel):
    class_name: str
    points: int

class OverallTeamRow(BaseModel):
    rank: int
    team_name: str
    class_scores: list[ClassScoreItem]
    total_points: int

class OverallSection(BaseModel):
    section_title: str
    teams: list[OverallTeamRow]

class StandingsV3Response(BaseModel):
    event_template: str
    class_sections: list[ClassSection]
    overall_section: OverallSection | None = None


# --- 認証 ---

class UserOut(BaseModel):
    id: str
    email: str
    role: str
    live_reporter: bool = False

    class Config:
        from_attributes = True


# --- 速報（途中経過） ---

class LiveReportUpsert(BaseModel):
    boat_class: str | None = None   # 470 / SNIPE / None
    race_number: int
    stage: str                      # 例: 1上 / 2上 / finish
    boat_ids: list[int] = []        # 回航順の boat_id
    note: str | None = None


class LiveReportPosition(BaseModel):
    rank: int
    boat_id: int
    sail_number: str
    team_name: str | None = None


class LiveReportOut(BaseModel):
    id: int
    tournament_id: int
    boat_class: str | None = None
    race_number: int
    stage: str
    positions: list[LiveReportPosition] = []
    note: str | None = None
    updated_at: str | None = None


class InviteRequest(BaseModel):
    email: str
    role: str = "member"
    tournament_ids: list[int] = []  # member の場合に担当大会を指定


class InviteResponse(BaseModel):
    message: str
    email: str
    role: str


class TournamentMemberAdd(BaseModel):
    user_id: str
    tournament_id: int


class TournamentMemberOut(BaseModel):
    user_id: str
    email: str
    role: str


class AddMemberRequest(BaseModel):
    email: str