from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)          # Supabase UUID
    email = Column(String, nullable=False, unique=True)
    role = Column(String, nullable=False, default="member")  # admin / member
    live_reporter = Column(Boolean, nullable=False, default=False)  # 速報入力を許可
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TournamentMember(Base):
    __tablename__ = "tournament_members"

    tournament_id = Column(Integer, ForeignKey("tournaments.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    role = Column(String, nullable=False, default="editor", server_default="editor")


class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    venue = Column(String, nullable=True)
    organizer = Column(String, nullable=True)
    class_name = Column(String, nullable=True)
    class_config = Column(String, nullable=True)   # 追加
    notes = Column(String, nullable=True)
    event_template = Column(String, nullable=False, default="INDIVIDUAL")
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)
    deleted_at = Column(String, nullable=True)

class Series(Base):
    __tablename__ = "series"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)

    name = Column(String, nullable=False)          # 例: main, women, prelim, final
    display_name = Column(String, nullable=False)  # 例: 本戦, 女子, 予選, 決勝

    scheduled_races = Column(Integer, nullable=True)
    max_races_per_day = Column(Integer, nullable=True)

    # discard rule
    discard_type = Column(String, nullable=False, default="NONE")
    discard_after_races = Column(Integer, nullable=True, default=None)
    discard_count = Column(Integer, nullable=False, default=0)

    # relation
    tournament = relationship("Tournament")


class RankingProfile(Base):
    __tablename__ = "ranking_profiles"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    series_id = Column(Integer, ForeignKey("series.id"), nullable=True)

    name = Column(String, nullable=False)          # 内部名
    display_name = Column(String, nullable=False)  # 表示名

    ranking_unit = Column(String, nullable=False)  # boat / team
    class_scope = Column(String, nullable=False, default="ALL")  # ALL / 470 / SNIPE

    scoring_team_size = Column(Integer, nullable=False, default=1)
    school_score_method = Column(String, nullable=False, default="SUM_TOP_N")
    # SUM_TOP_N
    # BEST_ONE_EACH_CLASS
    # ALL_RACES_SUM
    # INDIVIDUAL

    include_open_in_finish_scoring = Column(Boolean, nullable=False, default=True)
    include_open_in_series_ranking = Column(Boolean, nullable=False, default=True)
    include_open_in_school_ranking = Column(Boolean, nullable=False, default=False)

    target_group_tag = Column(String, nullable=True)  # 例: godai, rokudai, overall

    tournament = relationship("Tournament")
    series = relationship("Series")


class Boat(Base):
    __tablename__ = "boats"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False, index=True)
    entry_number = Column(Integer, nullable=True)
    boat_number = Column(String, nullable=True)
    sail_number = Column(String, nullable=False)
    organization_name = Column(String, nullable=True)
    helmsman_name = Column(String, nullable=True)
    helmsman_name2 = Column(String, nullable=True)
    helmsman_name3 = Column(String, nullable=True)
    crew_name = Column(String, nullable=True)
    crew_name2 = Column(String, nullable=True)
    crew_name3 = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    series_id = Column(Integer, ForeignKey("series.id"), nullable=True)
    boat_class = Column(String, nullable=True)  # 470 / SNIPE
    team_name = Column(String, nullable=True)   # 団体集計上の所属名

    is_open_entry = Column(Boolean, nullable=False, default=False)
    is_team_scoring_target = Column(Boolean, nullable=False, default=True)
    is_individual_scoring_target = Column(Boolean, nullable=False, default=True)

    group_tags = Column(String, nullable=True)  # "godai,overall" のようにCSVで仮実装

    tournament = relationship("Tournament")
    series = relationship("Series")


class RuleConfig(Base):
    __tablename__ = "rule_configs"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False, unique=True, index=True)

    scheduled_races = Column(Integer, nullable=False, default=1)
    minimum_races_for_series = Column(Integer, nullable=False, default=1)

    discard_enabled = Column(Integer, nullable=False, default=0)
    discard_start_race_count = Column(Integer, nullable=True)
    discard_count = Column(Integer, nullable=True)

    dnc_rule = Column(String, nullable=False, default="ENTRIES_PLUS_1")
    dns_rule = Column(String, nullable=False, default="ENTRIES_PLUS_1")
    ocs_rule = Column(String, nullable=False, default="STARTERS_PLUS_1")
    dnf_rule = Column(String, nullable=False, default="STARTERS_PLUS_1")
    ret_rule = Column(String, nullable=False, default="STARTERS_PLUS_1")
    dsq_rule = Column(String, nullable=False, default="STARTERS_PLUS_1")
    ufd_rule = Column(String, nullable=False, default="ENTRIES_PLUS_1")
    bfd_rule = Column(String, nullable=False, default="ENTRIES_PLUS_1")
    nsc_rule = Column(String, nullable=False, default="STARTERS_PLUS_1")
    dne_rule = Column(String, nullable=False, default="STARTERS_PLUS_1")
    custom_result_codes = Column(String, nullable=True)
    team_cut_method = Column(String, nullable=False, default="individual")
    overall_tie_method = Column(String, nullable=False, default="kanto")
    tie_fallback_extended = Column(Boolean, nullable=False, default=True)
    tie_use_excluded_scores = Column(Boolean, nullable=False, default=True)
    dne_score_method = Column(String, nullable=False, default="plus_one")
    sp_method = Column(String, nullable=False, default="dsq")
    use_appendix_t = Column(Boolean, nullable=False, default=True)
    same_school_rule = Column(Boolean, nullable=False, default=False)
    min_races_to_complete = Column(Integer, nullable=False, default=1)
    fleet_split = Column(Boolean, nullable=False, default=False)
    fleet_split_method = Column(String, nullable=False, default="own")
    preset_template = Column(String, nullable=False, default="custom")

    stp_penalty_points = Column(Float, nullable=False, default=3.0)
    scp_multiplier = Column(Float, nullable=False, default=1.3)
    arb_multiplier = Column(Float, nullable=False, default=1.3)
    prp_multiplier = Column(Float, nullable=False, default=1.3)
    zfp_multiplier = Column(Float, nullable=False, default=1.2)


class Race(Base):
    __tablename__ = "races"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False, index=True)
    race_number = Column(Integer, nullable=False)
    name = Column(String, nullable=True)
    status = Column(String, nullable=False, default="DRAFT")
    race_date = Column(String, nullable=True)
    weather = Column(String, nullable=True)
    wind_direction = Column(String, nullable=True)
    wind_speed = Column(String, nullable=True)
    start_time = Column(String, nullable=True)
    finish_time_top = Column(String, nullable=True)
    finish_time_last = Column(String, nullable=True)

class LiveReport(Base):
    """速報（途中経過）。レースの 1上・2上・finish などの回航順位を記録する。"""
    __tablename__ = "live_reports"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False, index=True)
    boat_class = Column(String, nullable=True)      # 470 / SNIPE / None（単一クラス大会）
    race_number = Column(Integer, nullable=False)
    stage = Column(String, nullable=False)          # 例: 1上 / 2上 / finish
    positions = Column(String, nullable=False, default="[]")  # boat_id のJSON配列（回航順）
    note = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RaceResult(Base):
    __tablename__ = "race_results"

    id = Column(Integer, primary_key=True, index=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False, index=True)
    boat_id = Column(Integer, ForeignKey("boats.id"), nullable=False, index=True)

    finish_position = Column(Integer, nullable=True)
    result_code = Column(String, nullable=False, default="OK")
    points = Column(Integer, nullable=True)
    note = Column(String, nullable=True)

