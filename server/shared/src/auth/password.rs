use bcrypt::{hash, verify, DEFAULT_COST};
use crate::errors::{AppError, AppResult};

const COST: u32 = DEFAULT_COST; // 12 rounds

pub fn hash_password(plain: &str) -> AppResult<String> {
    hash(plain, COST)
        .map_err(|e| AppError::Internal(format!("bcrypt hash failed: {e}")))
}

pub fn verify_password(plain: &str, hashed: &str) -> AppResult<bool> {
    verify(plain, hashed)
        .map_err(|e| AppError::Internal(format!("bcrypt verify failed: {e}")))
}
