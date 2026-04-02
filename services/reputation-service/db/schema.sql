CREATE TABLE IF NOT EXISTS User_Reputation (
    User_ID INT PRIMARY KEY,
    Shares_Cnt INT DEFAULT 0,
    Claims_Cnt INT DEFAULT 0,
    Failed_Posts_Cnt INT DEFAULT 0,
    Avg_Response_Mins INT DEFAULT 0,
    Rating DECIMAL(3,2) DEFAULT 5.0,
    Total_Points INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Reviews (
    Review_ID SERIAL PRIMARY KEY,
    Reviewer_ID INT NOT NULL,
    Reviewed_User_ID INT NOT NULL,
    Claim_ID INT NOT NULL UNIQUE,
    Rating_Score INT CHECK (Rating_Score >= 1 AND Rating_Score <= 5),
    Comment TEXT,
    Created_At TIMESTAMP DEFAULT NOW()
);
