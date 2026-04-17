-- Login Tokens Table for Secure Login Links
-- Each token is single-use and expires in 15 minutes

CREATE TABLE IF NOT EXISTS login_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_token (token),
    INDEX idx_user_expires (user_id, expires_at),
    INDEX idx_expires (expires_at)
);

-- Clean up expired tokens (run this periodically)
-- DELETE FROM login_tokens WHERE expires_at < NOW();