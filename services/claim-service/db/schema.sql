CREATE TABLE IF NOT EXISTS Claims (
    Claim_ID SERIAL PRIMARY KEY,
    Post_ID INT NOT NULL,
    Claimer_ID INT NOT NULL,
    Donor_ID INT NOT NULL,
    Requested_At TIMESTAMP DEFAULT NOW(),
    Responded_At TIMESTAMP NULL,
    Status VARCHAR(20) DEFAULT 'Pending',
    Is_Rated BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_claims_post_id ON Claims(Post_ID);
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_post_claimer ON Claims(Post_ID, Claimer_ID) WHERE Status = 'Pending';
