-- Table: buildflow.userss

-- DROP TABLE IF EXISTS "buildflow".userss;

CREATE TABLE IF NOT EXISTS "buildflow".userss
(
    id SERIAL PRIMARY KEY, 
    name VARCHAR(100) NOT NULL, 
    email VARCHAR(100) UNIQUE NOT NULL, 
    password_hash TEXT NOT NULL, 
    phone VARCHAR(20), 
    id_number VARCHAR(50), -- الهوية
    bank_account VARCHAR(100), -- الحساب البنكي
    location TEXT, -- الموقع
    profile_image TEXT, -- صورة الملف الشخصي
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS "buildflow".userss
    OWNER to postgres;


-- OFFICES TABLE
CREATE TABLE IF NOT EXISTS "buildflow".offices ( 
    id SERIAL PRIMARY KEY, 
    name VARCHAR(100) NOT NULL, 
    email VARCHAR(100) UNIQUE NOT NULL, 
    password_hash TEXT NOT NULL, 
    phone VARCHAR(20),
    location TEXT NOT NULL, 
    capacity INT, 
    rating FLOAT, 
    is_available BOOLEAN DEFAULT TRUE, 
    points INT DEFAULT 0, -- نقاط التقييم
    bank_account VARCHAR(100), -- حساب بنكي
    staff_count INT, -- عدد الموظفين
    active_projects_count INT DEFAULT 0, -- المشاريع الحالية
    branches TEXT, -- قائمة الفروع
    profile_image TEXT, -- صورة الملف الشخصي
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- COMPANIES TABLE
CREATE TABLE IF NOT EXISTS "buildflow".companies ( 
    id SERIAL PRIMARY KEY, 
    name VARCHAR(100) NOT NULL, 
    email VARCHAR(100), 
    phone VARCHAR(20), 
    password_hash TEXT NOT NULL, 
    description TEXT, 
    rating FLOAT, 
    company_type VARCHAR(100), -- نوع الشركة
    location TEXT, 
    bank_account VARCHAR(100), 
    staff_count INT, 
    profile_image TEXT, -- صورة الملف الشخصي
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);
-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS "buildflow".projects ( 
    id SERIAL PRIMARY KEY, 
    user_id INT REFERENCES "buildflow".userss(id), 
    office_id INT REFERENCES "buildflow".offices(id), 
    company_id INT REFERENCES "buildflow".companies(id), 
    name VARCHAR(150) NOT NULL, 
    description TEXT, 
    status VARCHAR(50) DEFAULT 'Pending', 
    budget DECIMAL(12, 2), 
    start_date DATE, 
    end_date DATE, 
    location TEXT, 
    license_file TEXT, 
    agreement_file TEXT, 
    document_2d TEXT, 
    document_3d TEXT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS "buildflow".reviews ( 
    id SERIAL PRIMARY KEY, 
    user_id INT REFERENCES "buildflow".userss(id), 
    company_id INT REFERENCES "buildflow".companies(id), 
    project_id INT REFERENCES "buildflow".projects(id), 
    rating INT CHECK (rating BETWEEN 1 AND 5), 
    comment TEXT, 
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS "buildflow".notifications ( 
    id SERIAL PRIMARY KEY, 
    user_id INT REFERENCES "buildflow".userss(id), 
    office_id INT REFERENCES "buildflow".offices(id),
    message TEXT NOT NULL, 
    is_read BOOLEAN DEFAULT FALSE, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS "buildflow".project_designs (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES "buildflow".projects(id), 
  floor_count INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  kitchens INTEGER,
  balconies INTEGER,
  special_rooms TEXT[], -- array of room types like ["Salon", "Dining"]
  directional_rooms JSONB, -- list of {room, direction}
  kitchen_type VARCHAR(50),
  master_has_bathroom BOOLEAN,
  general_description TEXT,
  interior_design TEXT,
  room_distribution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);




--Users
INSERT INTO "buildflow".userss (name, email, password_hash, phone, id_number, bank_account, location, profile_image)
VALUES 
('Ahmed Al-Saleh', 'ahmed@example.com', 'hashed_pw_1', '05991456', '1234567890', 'PS1234567890123456789012', 'Ramallah', 'images/users/ahmed.jpg'),
('Sara Khalil', 'sara@example.com', 'hashed_pw_2', '05994312', '2234567890', 'PS2234567890123456789012', 'Nablus', 'images/users/sara.jpg'),
('Yousef Barakat', 'yousef@example.com', 'hashed_pw_3', '05996543', '3234567890', 'PS3234567890123456789012', 'Hebron', 'images/users/yousef.jpg'),
('Lina Hani', 'lina@example.com', 'hashed_pw_4', '05999886', '4234567890', 'PS4234567890123456789012', 'Bethlehem', 'images/users/lina.jpg'),
('Khaled Jaber', 'khaled@example.com', 'hashed_pw_5', '05990122', '5234567890', 'PS5234567890123456789012', 'Jenin', 'images/users/khaled.jpg'),
('Mona Taha', 'mona@example.com', 'hashed_pw_6', '05998766', '6234567890', 'PS6234567890123456789012', 'Tulkarm', 'images/users/mona.jpg'),
('Omar Odeh', 'omar@example.com', 'hashed_pw_7', '05994432', '7234567890', 'PS7234567890123456789012', 'Qalqilya', 'images/users/omar.jpg'),
('Hadeel Nassar', 'hadeel@example.com', 'hashed_pw_8', '05995567', '8234567890', 'PS8234567890123456789012', 'Salfit', 'images/users/hadeel.jpg'),
('Bassam Saeed', 'bassam@example.com', 'hashed_pw_9', '05996677', '9234567890', 'PS9234567890123456789012', 'Jericho', 'images/users/bassam.jpg'),
('Rania Shihadeh', 'rania@example.com', 'hashed_pw_10', '05991122', '1034567890', 'PS1034567890123456789012', 'Gaza', 'images/users/rania.jpg');

--Offices 
INSERT INTO "buildflow".offices (name, email, password_hash, phone, location, capacity, rating, is_available, points, bank_account, staff_count, active_projects_count, branches, profile_image)
VALUES 
('Verona Engineering Office', 'verona@example.com', 'hashed_pw_3', '05997654', 'Al-Badhan - Al-Fara Street', 20, 4.5, TRUE, 120, 'PS1122334455667788990011', 10, 2, '', 'images/offices/v.jpg'),
('Pioneering Engineers Office (PEAK)', 'infopeak@example.com', 'hashed_pw_4', '05994561', 'Nablus', 15, 4.8, TRUE, 95, 'PS2233445566778899001122', 8, 1, 'Nablus, Tobas, Hebron', 'images/offices/fb.jpg'),
('Al-Manar Engineering Office', 'almanar@example.com', 'hashed_pw_5', '05991234', 'Ramallah', 18, 4.2, TRUE, 80, 'PS3344556677889900112233', 9, 1, '', 'images/offices/almanar.jpg'),
('Al-Quds Technical Consulting', 'alqtech@example.com', 'hashed_pw_6', '05992345', 'Hebron', 22, 4.6, TRUE, 110, 'PS4455667788990011223344', 11, 3, 'Hebron, Bethlehem', 'images/offices/alq.jpg'),
('An-Najah Engineering Office', 'najaheng@example.com', 'hashed_pw_7', '05993456', 'Nablus - Al-Quds Street', 25, 4.9, TRUE, 130, 'PS5566778899001122334455', 12, 4, '', 'images/offices/najah.jpg'),
('Al-Benaa Design Studio', 'albenaa@example.com', 'hashed_pw_8', '05990123', 'Gaza - Rimal', 12, 4.1, TRUE, 70, 'PS6677889900112233445566', 6, 1, '', 'images/offices/benaa.jpg'),
('Future Vision Engineers', 'futurevision@example.com', 'hashed_pw_9', '05997612', 'Jenin - City Center', 16, 4.3, TRUE, 85, 'PS7788990011223344556677', 7, 2, '', 'images/offices/future.jpg'),
('Elite Engineering Solutions', 'eliteeng@example.com', 'hashed_pw_10', '05998872', 'Tulkarm - Industrial Zone', 14, 4.0, TRUE, 65, 'PS8899001122334455667788', 5, 0, '', 'images/offices/elite.jpg'),
('Architects of Palestine', 'aop@example.com', 'hashed_pw_11', '05995543', 'Bethlehem', 19, 4.4, TRUE, 92, 'PS9900112233445566778899', 8, 2, '', 'images/offices/aop.jpg'),
('Al-Majd Consulting Engineers', 'almajd@example.com', 'hashed_pw_12', '05992276', 'Qalqilya', 13, 4.2, TRUE, 77, 'PS0011223344556677889900', 6, 1, '', 'images/offices/almajd.jpg');


--Companies 
INSERT INTO "buildflow".companies (name, email, phone, password_hash, description, rating, company_type, location, bank_account, staff_count, created_at, profile_image)
VALUES
('Arab Contractors Palestine', 'acp@example.com', '05998765', 'hashed_pw_1', 'Leading construction company with regional projects.', 4.7, 'Construction', 'Ramallah', 'PS1122334455667788990001', 50, CURRENT_TIMESTAMP, 'images/companies/acp.jpg'),
('Jerusalem Engineers Co.', 'jec@example.com', '05997654', 'hashed_pw_2', 'Specialized in architectural design and supervision.', 4.5, 'Engineering', 'Jerusalem', 'PS2233445566778899001122', 30, CURRENT_TIMESTAMP, 'images/companies/jec.jpg'),
('PalBuild Contractors', 'palbuild@example.com', '05994561', 'hashed_pw_3', 'Experts in residential and commercial buildings.', 4.3, 'Construction', 'Hebron', 'PS3344556677889900112233', 40, CURRENT_TIMESTAMP, 'images/companies/palbuild.jpg'),
('Gaza Engineering Group', 'geg@example.com', '05991234', 'hashed_pw_4', 'Infrastructure and urban planning specialists.', 4.2, 'Engineering', 'Gaza', 'PS4455667788990011223344', 35, CURRENT_TIMESTAMP, 'images/companies/geg.jpg'),
('Nablus Arch & Build', 'nabuild@example.com', '05992345', 'hashed_pw_5', 'Integrated architectural solutions for Palestine.', 4.6, 'Architecture', 'Nablus', 'PS5566778899001122334455', 25, CURRENT_TIMESTAMP, 'images/companies/nabuild.jpg'),
('Future Palestine Developers', 'fpd@example.com', '05993456', 'hashed_pw_6', 'Modern housing and urban development.', 4.1, 'Construction', 'Bethlehem', 'PS6677889900112233445566', 45, CURRENT_TIMESTAMP, 'images/companies/fpd.jpg'),
('Al-Quds Engineering Union', 'qeunion@example.com', '05990123', 'hashed_pw_7', 'National union for engineering consultation.', 4.4, 'Consulting', 'Jerusalem', 'PS7788990011223344556677', 20, CURRENT_TIMESTAMP, 'images/companies/qeunion.jpg'),
('West Bank Builders', 'wbb@example.com', '05997612', 'hashed_pw_8', 'Specialists in infrastructure projects.', 4.0, 'Construction', 'Tulkarm', 'PS8899001122334455667788', 28, CURRENT_TIMESTAMP, 'images/companies/wbb.jpg'),
('Green Horizon Engineering', 'greenh@example.com', '05998872', 'hashed_pw_9', 'Eco-friendly architecture and planning.', 4.5, 'Architecture', 'Jenin', 'PS9900112233445566778899', 18, CURRENT_TIMESTAMP, 'images/companies/greenh.jpg'),
('Elite Contractors Co.', 'eliteco@example.com', '05995543', 'hashed_pw_10', 'Full-service contractor from design to execution.', 4.3, 'Construction', 'Qalqilya', 'PS0011223344556677889900', 32, CURRENT_TIMESTAMP, 'images/companies/eliteco.jpg');


--Projects 
INSERT INTO "buildflow".projects (name, description, start_date, end_date, status, budget, location, office_id, company_id, user_id)
VALUES
('Ahmed Al-Saleh''s House Construction', 'Construction of a residential house for Ahmed Al-Saleh in Ramallah.', '2024-06-01', '2025-06-01', 'In Progress', 500000, 'Ramallah', 1, 1, 1),
('Sara Khalil''s Villa Project', 'Building a luxurious villa for Sara Khalil in Nablus.', '2024-07-01', '2025-07-01', 'Planning', 300000, 'Nablus', 2, 2, 2),
('Yousef Barakat''s House Design', 'Design and construction of a family house for Yousef Barakat in Hebron.', '2024-05-15', '2025-05-15', 'In Progress', 1000000, 'Hebron', 5, 4, 3),
('Lina Hani''s House Construction', 'Construction of a modern house for Lina Hani in Bethlehem.', '2024-09-01', '2026-03-01', 'In Progress', 1200000, 'Bethlehem', 9, 5, 4),
('Khaled Jaber''s Home Renovation', 'Renovation project for Khaled Jabers house in Jenin.', '2024-08-01', '2025-08-01', 'Planning', 800000, 'Jenin', 10, 7, 5),
('Mona Taha''s Residential Project', 'Building a new home for Mona Taha in Tulkarm.', '2024-06-01', '2025-06-01', 'In Progress', 600000, 'Tulkarm', 4, 6, 6),
('Omar Odeh''s Dream House', 'Construction of a personalized house for Omar Odeh in Qalqilya.', '2024-05-01', '2026-05-01', 'Planning', 1500000, 'Qalqilya', 8, 3, 7),
('Hadeel Nassar''s Family Home', 'Building a new family house for Hadeel Nassar in Salfit.', '2024-07-15', '2025-07-15', 'In Progress', 900000, 'Salfit', 6, 8, 8),
('Bassam Saeed''s House Project', 'A house construction project for Bassam Saeed in Jericho.', '2024-05-10', '2025-05-10', 'Completed', 400000, 'Jericho', 7, 9, 9),
('Rania Shihadeh''s House Build', 'Construction of Rania Shihadehs house in Gaza.', '2024-09-10', '2025-09-10', 'Planning', 700000, 'Gaza', 3, 10, 10);


--Reviews
INSERT INTO "buildflow".reviews (user_id,  office_id ,company_id, project_id, rating, comment, reviewed_at)
VALUES 
(1, 1, 1, 1, 4, 'Great work on the construction of my house.', CURRENT_TIMESTAMP),
(2, 1, 2, 2, 5, 'Excellent design and execution on my new home.', CURRENT_TIMESTAMP),
(3, 1, 3, 3, 3, 'The project took longer than expected, but the quality was decent.', CURRENT_TIMESTAMP),
(4, 2, 4, 4, 4, 'Very satisfied with the project; some minor issues were resolved.', CURRENT_TIMESTAMP),
(5, 2, 5, 5, 2, 'Not happy with the renovations. A lot of issues during construction.', CURRENT_TIMESTAMP);

--Notifications 
INSERT INTO "buildflow".notifications (user_id, message, is_read, created_at)
VALUES
(1, 'Your house construction project has been updated. Please check for more details.', FALSE, CURRENT_TIMESTAMP),
(2, 'New office project assigned to you. Please review the project details.', FALSE, CURRENT_TIMESTAMP),
(3, 'Your feedback on the project has been successfully submitted.', TRUE, CURRENT_TIMESTAMP),
(4, 'Your project has been completed and is now ready for inspection.', TRUE, CURRENT_TIMESTAMP),
(5, 'The project budget has been updated. Please review the new budget details.', FALSE, CURRENT_TIMESTAMP);


-- table for steps
CREATE TABLE permit_steps (
    id SERIAL PRIMARY KEY,
    user_id INT,  -- if you want to track per user/session
    step1 BOOLEAN NOT NULL DEFAULT FALSE,
    step2 BOOLEAN NOT NULL DEFAULT FALSE,
    step3 BOOLEAN NOT NULL DEFAULT FALSE,
    step4 BOOLEAN NOT NULL DEFAULT FALSE,
    selected_nav_index INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP,  -- when the user submitted documents
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


--  تعديل جدول المشاريع (projects) لتخزين معلومات الأرض
ALTER TABLE "buildflow".projects
ADD COLUMN land_area DECIMAL(10, 2),      -- مساحة الأرض
ADD COLUMN plot_number VARCHAR(50),       -- رقم القطعة
ADD COLUMN basin_number VARCHAR(50),      -- رقم الحوض
ADD COLUMN land_location TEXT;            -- موقع الأرض


-- تعديل جدول المشاريع (projects) لتخزين توقيع الاتفاقية وحالتها:

ALTER TABLE "buildflow".projects
ADD COLUMN signed_at TIMESTAMP,               -- وقت توقيع الاتفاقية
ADD COLUMN agreement_status VARCHAR(50) DEFAULT 'Pending'; -- حالة الاتفاقية

-- تخزين بيانات
UPDATE "buildflow".projects
SET land_area = 250.75, plot_number = '123A', basin_number = '456B', land_location = 'Ramallah - Al-Masyoun'
WHERE id = 1;

UPDATE "buildflow".projects
SET land_area = 300.50, plot_number = '321B', basin_number = '654A', land_location = 'Nablus - Al-Maajen'
WHERE id = 2;

UPDATE "buildflow".projects
SET land_area = 150.00, plot_number = '789C', basin_number = '987D', land_location = 'Hebron - Al-Haras'
WHERE id = 3;

UPDATE "buildflow".projects
SET land_area = 400.25, plot_number = '456D', basin_number = '654C', land_location = 'Bethlehem - Al-Khader'
WHERE id = 4;

UPDATE "buildflow".projects
SET land_area = 200.10, plot_number = '147E', basin_number = '258F', land_location = 'Jenin - City Center'
WHERE id = 5;

UPDATE "buildflow".projects
SET land_area = 350.40, plot_number = '369G', basin_number = '963H', land_location = 'Tulkarm - North Entrance'
WHERE id = 6;

UPDATE "buildflow".projects
SET land_area = 280.30, plot_number = '852I', basin_number = '741J', land_location = 'Qalqilya - West Street'
WHERE id = 7;

UPDATE "buildflow".projects
SET land_area = 310.20, plot_number = '963K', basin_number = '147L', land_location = 'Salfit - Main Road'
WHERE id = 8;

UPDATE "buildflow".projects
SET land_area = 190.70, plot_number = '456M', basin_number = '654N', land_location = 'Jericho - South Entrance'
WHERE id = 9;

UPDATE "buildflow".projects
SET land_area = 220.80, plot_number = '321O', basin_number = '123P', land_location = 'Gaza - Al-Rimal'
WHERE id = 10;
 

-- توقيع الاتفاقية امثلة

UPDATE "buildflow".projects
SET agreement_status = 'Signed', signed_at = '2024-06-01 09:30:00'
WHERE id = 1;

UPDATE "buildflow".projects
SET agreement_status = 'Signed', signed_at = '2024-07-15 10:15:00'
WHERE id = 2;

UPDATE "buildflow".projects
SET agreement_status = 'Signed', signed_at = '2024-05-20 11:45:00'
WHERE id = 3;

UPDATE "buildflow".projects
SET agreement_status = 'Pending', signed_at = NULL
WHERE id = 4;

UPDATE "buildflow".projects
SET agreement_status = 'Cancelled', signed_at = '2024-08-05 12:00:00'
WHERE id = 5;

UPDATE "buildflow".projects
SET agreement_status = 'Signed', signed_at = '2024-06-10 14:30:00'
WHERE id = 6;

UPDATE "buildflow".projects
SET agreement_status = 'Signed', signed_at = '2024-05-25 15:00:00'
WHERE id = 7;

UPDATE "buildflow".projects
SET agreement_status = 'Pending', signed_at = NULL
WHERE id = 8;

UPDATE "buildflow".projects
SET agreement_status = 'Completed', signed_at = '2024-05-15 16:20:00'
WHERE id = 9;

UPDATE "buildflow".projects
SET agreement_status = 'Signed', signed_at = '2024-09-10 17:00:00'
WHERE id = 10;
