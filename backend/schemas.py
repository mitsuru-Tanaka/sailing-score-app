from pydantic import BaseModel
from typing import Optional

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
    is_open_entry: bool = False
    is_team_scoring_target: bool = True
    is_individual_scoring_target: bool = True
    group_tags: Optional[str] = None

    notes: str | None = None


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

    class Config:
        from_attributes = True

class RaceCreate(BaseModel):
    race_number: int
    name: str | None = None
    status: str = "DRAFT"


class RaceOut(BaseModel):
    id: int
    tournament_id: int
    race_number: int
    name: str | None = None
    status: str

    class Config:
        from_attributes = True

class RaceResultInput(BaseModel):
    boat_id: int
    finish_position: int | None = None
    result_code: str = "OK"
    note: str | None = None


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
    team_race_totals: list[int]
    team_total: int
    boats: list[BoatDetailRow]

class ClassSection(BaseModel):
    class_name: str
    section_title: str
    race_count: int
    teams: list[TeamClassBlock]

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

    class Config:
        from_attributes = True


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