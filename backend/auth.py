import os
from dataclasses import dataclass
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from db import get_db

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
AUTH_ENABLED = bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)

print(f"[auth] AUTH_ENABLED={AUTH_ENABLED}", flush=True)

_supabase_client = None


def get_supabase():
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase_client


# ローカル開発用ダミーユーザー（SUPABASE_URL 未設定時）
@dataclass
class _DevUser:
    id: str = "dev-user-id"
    email: str = "dev@localhost"
    role: str = "admin"


security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
):
    """
    認証済みユーザーを返す。
    SUPABASE_URL 未設定（ローカル開発）の場合はダミー admin を返す。
    """
    if not AUTH_ENABLED:
        return _DevUser()

    if credentials is None:
        raise HTTPException(status_code=401, detail="認証が必要です")

    try:
        supabase = get_supabase()
        resp = supabase.auth.get_user(credentials.credentials)
        sb_user = resp.user
        if sb_user is None:
            raise HTTPException(status_code=401, detail="無効なトークンです")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"トークン検証エラー: {e}")

    # 本DB内の users レコードを取得（なければ自動作成）
    from models import User
    user = db.query(User).filter(User.id == sb_user.id).first()
    if user is None:
        user = User(id=sb_user.id, email=sb_user.email or "", role="member")
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def require_admin(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    return user


def check_tournament_access(tournament_id: int, user, db: Session, owner_only: bool = False):
    """admin は常にアクセス可。それ以外は tournament_members に登録が必要。
    owner_only=True の場合は owner ロールのみ許可。"""
    if user.role == "admin":
        return
    from models import TournamentMember
    member = db.query(TournamentMember).filter(
        TournamentMember.tournament_id == tournament_id,
        TournamentMember.user_id == user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="この大会へのアクセス権限がありません")
    if owner_only and member.role != "owner":
        raise HTTPException(status_code=403, detail="大会オーナーのみ実行可能です")
