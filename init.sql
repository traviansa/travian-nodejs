-- Create tables for Travian game

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  tribe INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Villages table
CREATE TABLE IF NOT EXISTS villages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100),
  x INT,
  y INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  village_id INT NOT NULL,
  wood INT DEFAULT 0,
  clay INT DEFAULT 0,
  iron INT DEFAULT 0,
  crop INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  village_id INT NOT NULL,
  type VARCHAR(50),
  level INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Units table
CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  village_id INT NOT NULL,
  type VARCHAR(50),
  count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  subject VARCHAR(255),
  body TEXT,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attacker_id INT,
  defender_id INT,
  attacker_village_id INT,
  defender_village_id INT,
  result VARCHAR(50),
  casualties_attacker INT DEFAULT 0,
  casualties_defender INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attacker_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (defender_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (attacker_village_id) REFERENCES villages(id) ON DELETE SET NULL,
  FOREIGN KEY (defender_village_id) REFERENCES villages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for better performance
CREATE INDEX idx_user_id ON villages(user_id);
CREATE INDEX idx_village_id ON resources(village_id);
CREATE INDEX idx_building_village ON buildings(village_id);
CREATE INDEX idx_units_village ON units(village_id);
CREATE INDEX idx_messages_to_user ON messages(to_user_id);
CREATE INDEX idx_messages_from_user ON messages(from_user_id);
CREATE INDEX idx_reports_attacker ON reports(attacker_id);
CREATE INDEX idx_reports_defender ON reports(defender_id);

-- Insert sample data
INSERT INTO users (name, email, password, tribe) VALUES 
('Admin', 'admin@travian.local', 'admin123', 1),
('Player1', 'player1@travian.local', 'pass123', 1),
('Player2', 'player2@travian.local', 'pass123', 2);

INSERT INTO villages (user_id, name, x, y) VALUES 
(1, 'Capital', 0, 0),
(2, 'Village 1', 10, 10),
(3, 'Village 2', -10, -10);

INSERT INTO resources (village_id, wood, clay, iron, crop) VALUES 
(1, 1000, 1000, 1000, 1000),
(2, 500, 500, 500, 500),
(3, 750, 750, 750, 750);
