CREATE TABLE IF NOT EXISTS Messages (
    Msg_ID SERIAL PRIMARY KEY,
    Post_ID INT NOT NULL,
    Sender_ID INT NOT NULL,
    Receiver_ID INT NOT NULL,
    Content TEXT NULL,
    Image_URL VARCHAR(500) NULL,
    Sent_At TIMESTAMP DEFAULT NOW(),
    Is_Read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_messages_post_id ON Messages(Post_ID);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON Messages(Sender_ID, Receiver_ID);
