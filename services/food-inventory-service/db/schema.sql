CREATE TABLE IF NOT EXISTS Food_Posts (
    Post_ID SERIAL PRIMARY KEY,
    Donor_ID INT NOT NULL,
    Pickup_Loc_ID INT,
    Food_Name VARCHAR(100) NOT NULL,
    Category VARCHAR(50) NOT NULL,
    Tags TEXT[],
    Image_URLs TEXT[],
    Quantity VARCHAR(50) NOT NULL,
    Description TEXT,
    Created_At TIMESTAMP DEFAULT NOW(),
    Updated_At TIMESTAMP DEFAULT NOW(),
    Best_Before_Date TIMESTAMP NOT NULL,
    Pickup_Lat DECIMAL(10, 8),
    Pickup_Lng DECIMAL(11, 8),
    Pending_Claims_Cnt INT DEFAULT 0,
    Status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS Watchlists (
    Watch_ID SERIAL PRIMARY KEY,
    User_ID INT NOT NULL,
    Keyword VARCHAR(100) NULL,
    Category VARCHAR(50) NULL,
    Radius_KM INT DEFAULT 5,
    Ref_Latitude DECIMAL(10, 8) NOT NULL,
    Ref_Longitude DECIMAL(11, 8) NOT NULL
);

CREATE OR REPLACE FUNCTION check_expiration()
RETURNS trigger AS $$
BEGIN
    IF NEW.Best_Before_Date < NOW() AND NEW.Status = 'Active' THEN
        IF NEW.Pending_Claims_Cnt > 0 THEN
            NEW.Status := 'Expired_Failed';
        ELSE
            NEW.Status := 'Expired';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_expiration ON Food_Posts;
CREATE TRIGGER trg_check_expiration
    BEFORE INSERT OR UPDATE ON Food_Posts
    FOR EACH ROW EXECUTE FUNCTION check_expiration();
