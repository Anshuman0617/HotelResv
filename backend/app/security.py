from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def _validate_bcrypt_password_length(password: str) -> None:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes")


def hash_password(password: str) -> str:
    _validate_bcrypt_password_length(password)
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    try:
        _validate_bcrypt_password_length(plain_password)
    except ValueError:
        return False
    return pwd_context.verify(plain_password, hashed_password)
