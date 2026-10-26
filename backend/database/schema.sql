-- Craftify schema (MySQL 8.0+, InnoDB, utf8mb4)
-- Run:  mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS craftify
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE craftify;

-- ---------------------------------------------------------------
-- users
-- admin_marker is 1 for the ADMIN row and NULL for everyone else.
-- A UNIQUE index on it allows at most ONE admin (NULLs don't collide).
-- ---------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name    VARCHAR(80)  NOT NULL,
  last_name     VARCHAR(80)  NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(30)  NULL,
  profile_image VARCHAR(500) NULL,
  address       VARCHAR(500) NULL,
  role          ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  admin_marker  TINYINT GENERATED ALWAYS AS (IF(role = 'ADMIN', 1, NULL)) STORED,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_single_admin (admin_marker),
  KEY idx_users_role (role),
  KEY idx_users_name (last_name, first_name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------
CREATE TABLE categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  description TEXT NULL,
  image       VARCHAR(500) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- products
-- ---------------------------------------------------------------
CREATE TABLE products (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id    INT UNSIGNED NOT NULL,
  name           VARCHAR(200) NOT NULL,
  description    TEXT NULL,
  price          DECIMAL(10,2) NOT NULL,
  image          VARCHAR(500) NULL,
  stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  is_available   TINYINT(1) NOT NULL DEFAULT 1,
  is_featured    TINYINT(1) NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT chk_products_price CHECK (price >= 0),
  KEY idx_products_category (category_id),
  KEY idx_products_listing (is_available, created_at),
  KEY idx_products_featured (is_featured),
  KEY idx_products_price (price),
  FULLTEXT KEY ft_products_search (name, description)
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  image_url  VARCHAR(500) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_pimages_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE,
  KEY idx_pimages_product (product_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- cart & favorites
-- ---------------------------------------------------------------
CREATE TABLE cart_items (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity   INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_user_product (user_id, product_id),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT chk_cart_qty CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE favorites (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fav_user_product (user_id, product_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- auctions (declared before orders so orders can reference them)
-- ---------------------------------------------------------------
CREATE TABLE auctions (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id          INT UNSIGNED NOT NULL,
  starting_price      DECIMAL(10,2) NOT NULL,
  current_highest_bid DECIMAL(10,2) NULL,
  highest_bidder_id   INT UNSIGNED NULL,
  start_time          DATETIME NOT NULL,
  end_time            DATETIME NOT NULL,
  status              ENUM('UPCOMING','ACTIVE','ENDED','CANCELLED') NOT NULL DEFAULT 'UPCOMING',
  winner_id           INT UNSIGNED NULL,
  winning_bid         DECIMAL(10,2) NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_auctions_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_auctions_highest_bidder FOREIGN KEY (highest_bidder_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_auctions_winner FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_auctions_start_price CHECK (starting_price > 0),
  CONSTRAINT chk_auctions_times CHECK (end_time > start_time),
  KEY idx_auctions_status_end (status, end_time),
  KEY idx_auctions_start (start_time),
  KEY idx_auctions_product (product_id),
  KEY idx_auctions_winner (winner_id)
) ENGINE=InnoDB;

CREATE TABLE bids (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  auction_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  amount     DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_bids_auction FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
  CONSTRAINT fk_bids_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_bids_amount CHECK (amount > 0),
  KEY idx_bids_auction_amount (auction_id, amount),
  KEY idx_bids_user (user_id, created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- orders (auction_id set only for orders created from a won auction)
-- ---------------------------------------------------------------
CREATE TABLE orders (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  auction_id       INT UNSIGNED NULL,
  total_amount     DECIMAL(10,2) NOT NULL,
  status           ENUM('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  payment_status   ENUM('PENDING','PAID') NOT NULL DEFAULT 'PENDING',
  shipping_address VARCHAR(500) NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_auction (auction_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_auction FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE SET NULL,
  KEY idx_orders_user (user_id, created_at),
  KEY idx_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  quantity    INT UNSIGNED NOT NULL,
  unit_price  DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_oitems_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oitems_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT chk_oitems_qty CHECK (quantity > 0),
  KEY idx_oitems_order (order_id),
  KEY idx_oitems_product (product_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- messages & notifications
-- ---------------------------------------------------------------
CREATE TABLE messages (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id   INT UNSIGNED NOT NULL,
  receiver_id INT UNSIGNED NOT NULL,
  subject     VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_msg_receiver (receiver_id, is_read, created_at),
  KEY idx_msg_sender (sender_id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  type         ENUM('NEW_MESSAGE','AUCTION_WON','AUCTION_LOST','AUCTION_ENDING_SOON',
                    'ORDER_CONFIRMED','ORDER_SHIPPED','ORDER_DELIVERED','GENERAL') NOT NULL,
  title        VARCHAR(200) NOT NULL,
  body         VARCHAR(500) NULL,
  related_type ENUM('AUCTION','ORDER','MESSAGE') NULL,
  related_id   INT UNSIGNED NULL,
  is_read      TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_notif_user (user_id, is_read, created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- seed: categories (the admin account is created by a backend seed
-- script in Stage 2, because the password must be bcrypt-hashed)
-- ---------------------------------------------------------------
INSERT INTO categories (name, description) VALUES
 ('Paintings',   'Original handmade paintings'),
 ('Vases',       'Handmade vases and vessels'),
 ('Bags',        'Handmade bags and totes'),
 ('Jewelry',     'Handcrafted jewelry'),
 ('Pottery',     'Wheel-thrown and hand-built pottery'),
 ('Cultural',    'Culturally inspired products'),
 ('Home Decor',  'Handmade decorations for the home'),
 ('Clothing',    'Handmade clothing'),
 ('Accessories', 'Handmade accessories'),
 ('Other',       'Other handmade creations');
