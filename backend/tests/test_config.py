import pytest
from pydantic import ValidationError

from app.config import Settings


def make_settings(secret: str, token_expiry_minutes: int = 60) -> Settings:
    return Settings(
        _env_file=None,
        JWT_SECRET_KEY=secret,
        ACCESS_TOKEN_EXPIRE_MINUTES=token_expiry_minutes,
    )


def test_jwt_secret_is_required(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


@pytest.mark.parametrize(
    "secret",
    [
        "short",
        "change-this-secret-in-production",
        "YOUR-SECRET-KEY".ljust(32, "!"),
        "<REPLACE-WITH-A-SECRET-OF-AT-LEAST-32-CHARACTERS>",
        "<REPLACE_WITH_A_REAL_SECRET_AT_LEAST_32_CHARACTERS>",
    ],
)
def test_rejects_short_or_placeholder_jwt_secrets(secret: str) -> None:
    with pytest.raises(ValidationError):
        make_settings(secret)


def test_accepts_environment_provided_jwt_secret() -> None:
    assert make_settings("a-user-provided-secret-with-more-than-32-chars").JWT_SECRET_KEY == (
        "a-user-provided-secret-with-more-than-32-chars"
    )


@pytest.mark.parametrize(
    "secret",
    [
        "   \t  ",
        "  " + "a" * 31 + "  ",
    ],
)
def test_rejects_secret_with_fewer_than_32_non_whitespace_characters(
    secret: str,
) -> None:
    with pytest.raises(ValidationError):
        make_settings(secret)


def test_trims_valid_secret_before_returning_it() -> None:
    secret = "a-user-provided-secret-with-more-than-32-chars"

    assert make_settings(f"  {secret}\t").JWT_SECRET_KEY == secret


def test_accepts_valid_access_token_expiry() -> None:
    assert make_settings(
        "a-user-provided-secret-with-more-than-32-chars",
        token_expiry_minutes=60,
    ).ACCESS_TOKEN_EXPIRE_MINUTES == 60


@pytest.mark.parametrize("expiry_minutes", [0, -1, 1441])
def test_rejects_out_of_range_access_token_expiry(expiry_minutes: int) -> None:
    with pytest.raises(ValidationError):
        make_settings(
            "a-user-provided-secret-with-more-than-32-chars",
            token_expiry_minutes=expiry_minutes,
        )
