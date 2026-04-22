
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `alok_pms` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `alok_pms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int DEFAULT NULL,
  `batch_card_no` varchar(20) DEFAULT NULL,
  `grade` varchar(100) DEFAULT NULL,
  `customer` varchar(200) DEFAULT NULL,
  `stage` varchar(100) DEFAULT NULL,
  `severity` enum('Critical','Warning') DEFAULT 'Warning',
  `hours_stuck` decimal(8,2) DEFAULT NULL,
  `acknowledged` tinyint(1) DEFAULT '0',
  `acknowledged_at` datetime DEFAULT NULL,
  `acknowledged_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int DEFAULT NULL,
  `batch_card_no` varchar(20) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `do_year` varchar(10) DEFAULT NULL,
  `prepared_by` varchar(100) DEFAULT NULL,
  `heat_no` varchar(50) DEFAULT NULL,
  `grade` varchar(100) DEFAULT NULL,
  `black_size_mm` decimal(10,2) DEFAULT NULL,
  `black_length_mm` varchar(50) DEFAULT NULL,
  `no_of_pcs` int DEFAULT NULL,
  `weight_mtm` decimal(10,3) DEFAULT NULL,
  `ht_process` varchar(100) DEFAULT NULL,
  `bright_bar_process` varchar(100) DEFAULT NULL,
  `finish_size_tol` varchar(100) DEFAULT NULL,
  `customer_name` varchar(200) DEFAULT NULL,
  `customer_do_no` varchar(100) DEFAULT NULL,
  `item_no` varchar(100) DEFAULT NULL,
  `length_mm` varchar(100) DEFAULT NULL,
  `colour_code` varchar(100) DEFAULT NULL,
  `chamfering` varchar(10) DEFAULT NULL,
  `bundle_weight_kg` decimal(10,2) DEFAULT NULL,
  `ra_value` varchar(50) DEFAULT NULL,
  `ovality` varchar(50) DEFAULT NULL,
  `straightness` varchar(50) DEFAULT NULL,
  `remark` text,
  `status` varchar(50) DEFAULT 'created',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_ht_process` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `date` date DEFAULT NULL,
  `furnace_no` varchar(50) DEFAULT NULL,
  `no_of_pcs` int DEFAULT NULL,
  `qty` decimal(10,3) DEFAULT NULL,
  `ht_process` varchar(100) DEFAULT NULL,
  `hardness` varchar(50) DEFAULT NULL,
  `tensile` varchar(50) DEFAULT NULL,
  `ok_not_ok` varchar(20) DEFAULT NULL,
  `remark` text,
  `operator_name` varchar(100) DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `batch_ht_process_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_inspection` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `date` date DEFAULT NULL,
  `pcs_received` int DEFAULT NULL,
  `ut_ok` int DEFAULT NULL,
  `ut_reject` int DEFAULT NULL,
  `mpi_reject` int DEFAULT NULL,
  `end_cut_wt` decimal(10,3) DEFAULT NULL,
  `total_ok_pcs` int DEFAULT NULL,
  `ok_wt` decimal(10,3) DEFAULT NULL,
  `rej_wt` decimal(10,3) DEFAULT NULL,
  `remark` text,
  `operator_name` varchar(100) DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `batch_inspection_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_process_route` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `stage` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `shift` varchar(10) DEFAULT NULL,
  `no_of_pcs` int DEFAULT NULL,
  `input_size` decimal(10,2) DEFAULT NULL,
  `output_size` decimal(10,2) DEFAULT NULL,
  `input_length` decimal(10,2) DEFAULT NULL,
  `finish_length` decimal(10,2) DEFAULT NULL,
  `ovality` decimal(10,3) DEFAULT NULL,
  `loss_weight` decimal(10,3) DEFAULT NULL,
  `remarks` text,
  `name_sign` varchar(100) DEFAULT NULL,
  `operator_name` varchar(100) DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `batch_process_route_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_stage_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_card_no` varchar(50) DEFAULT NULL,
  `from_stage` varchar(50) DEFAULT NULL,
  `to_stage` varchar(50) NOT NULL,
  `moved_by` varchar(100) DEFAULT NULL,
  `notes` text,
  `moved_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=243 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_card_no` varchar(50) DEFAULT NULL,
  `so_number` varchar(50) DEFAULT NULL,
  `line_no` int DEFAULT NULL,
  `so_id` int DEFAULT NULL,
  `heat_no` varchar(50) DEFAULT NULL,
  `grade_code` varchar(100) DEFAULT NULL,
  `size_mm` decimal(10,2) DEFAULT NULL,
  `length_mm` int DEFAULT '3000',
  `no_of_pcs` int DEFAULT NULL,
  `weight_kg` decimal(12,3) DEFAULT NULL,
  `ht_process` varchar(100) DEFAULT NULL,
  `bb_process` varchar(100) DEFAULT NULL,
  `tolerance` varchar(100) DEFAULT NULL,
  `colour_code` varchar(100) DEFAULT NULL,
  `prepared_by` varchar(100) DEFAULT NULL,
  `customer` varchar(200) DEFAULT NULL,
  `shed` varchar(50) DEFAULT NULL,
  `current_stage` varchar(100) DEFAULT 'RM Receive',
  `current_stage_index` int DEFAULT '0',
  `status` varchar(50) DEFAULT 'In Progress',
  `priority` varchar(20) DEFAULT 'On Track',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `mtc_required` tinyint(1) DEFAULT '1',
  `ut_required` tinyint(1) DEFAULT '1',
  `ends_finish` varchar(50) DEFAULT 'Chamfered',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_card_no` (`batch_card_no`)
) ENGINE=InnoDB AUTO_INCREMENT=246 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ci_line_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(50) NOT NULL,
  `so_number` varchar(50) DEFAULT NULL,
  `so_date` date DEFAULT NULL,
  `po_no` varchar(50) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `heat_no` varchar(20) DEFAULT NULL,
  `grade` varchar(50) DEFAULT NULL,
  `size_mm` decimal(8,2) DEFAULT NULL,
  `length_mm` varchar(20) DEFAULT '3000-3200',
  `tolerance` varchar(20) DEFAULT 'h9',
  `finish` varchar(100) DEFAULT 'ANN + PEELED +GROUND',
  `qty_kgs` decimal(12,3) DEFAULT NULL,
  `rate_euro` decimal(10,2) DEFAULT NULL,
  `value_euro` decimal(12,2) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `invoice_no` (`invoice_no`),
  CONSTRAINT `ci_line_items_ibfk_1` FOREIGN KEY (`invoice_no`) REFERENCES `commercial_invoices` (`invoice_no`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commercial_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(50) NOT NULL,
  `invoice_date` date DEFAULT NULL,
  `buyer_name` varchar(200) DEFAULT NULL,
  `buyer_address` text,
  `pre_carriage` varchar(50) DEFAULT 'BY SEA',
  `place_of_receipt` varchar(100) DEFAULT 'JNPT., NHAVA SHEVA',
  `vessel_flight` varchar(100) DEFAULT NULL,
  `port_of_loading` varchar(100) DEFAULT 'NHAVA SHEVA',
  `port_of_discharge` varchar(100) DEFAULT NULL,
  `final_destination` varchar(100) DEFAULT NULL,
  `country_of_origin` varchar(50) DEFAULT 'INDIA',
  `country_of_destination` varchar(50) DEFAULT NULL,
  `terms_of_payment` varchar(50) DEFAULT 'DP',
  `marks_no` varchar(200) DEFAULT NULL,
  `container_no` varchar(100) DEFAULT NULL,
  `seal_no` varchar(100) DEFAULT NULL,
  `hlk_no` varchar(100) DEFAULT NULL,
  `hs_no` varchar(50) DEFAULT NULL,
  `package_count` varchar(20) DEFAULT NULL,
  `package_kind` varchar(50) DEFAULT 'BUNDLES',
  `net_weight` decimal(12,3) DEFAULT NULL,
  `gross_weight` decimal(12,3) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT '27AAECA7915K1ZF',
  `ie_no` varchar(20) DEFAULT '0304079421',
  `bl_no` varchar(50) DEFAULT NULL,
  `bl_date` date DEFAULT NULL,
  `sb_no` varchar(50) DEFAULT NULL,
  `sb_date` date DEFAULT NULL,
  `status` enum('Draft','Issued','Cancelled') DEFAULT 'Draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_no` (`invoice_no`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_sync_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `crm_offer_id` varchar(50) NOT NULL,
  `so_number` varchar(50) DEFAULT NULL,
  `synced_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` enum('Success','Failed') DEFAULT 'Success',
  `error_message` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `crm_offer_id` (`crm_offer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=191 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_grade_specs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `grade_code` varchar(20) NOT NULL,
  `c_min` decimal(5,3) DEFAULT NULL,
  `c_max` decimal(5,3) DEFAULT NULL,
  `cr_min` decimal(5,3) DEFAULT NULL,
  `cr_max` decimal(5,3) DEFAULT NULL,
  `ni_min` decimal(5,3) DEFAULT NULL,
  `ni_max` decimal(5,3) DEFAULT NULL,
  `mo_min` decimal(5,3) DEFAULT NULL,
  `mo_max` decimal(5,3) DEFAULT NULL,
  `s_min` decimal(5,3) DEFAULT NULL,
  `s_max` decimal(5,3) DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_id` (`customer_id`,`grade_code`),
  CONSTRAINT `customer_grade_specs_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(100) NOT NULL,
  `short_code` varchar(20) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `address` text,
  `contact_person` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `payment_terms` text,
  `incoterm` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatch_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dispatch_id` int NOT NULL,
  `batch_card_no` varchar(20) DEFAULT NULL,
  `heat_no` varchar(50) DEFAULT NULL,
  `grade` varchar(100) DEFAULT NULL,
  `size_mm` decimal(10,2) DEFAULT NULL,
  `no_of_pcs` int DEFAULT NULL,
  `net_wt_kg` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dispatch_id` (`dispatch_id`),
  CONSTRAINT `dispatch_batches_ibfk_1` FOREIGN KEY (`dispatch_id`) REFERENCES `dispatches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(50) DEFAULT NULL,
  `dispatch_date` date DEFAULT NULL,
  `dispatch_type` enum('Export','Domestic') DEFAULT 'Export',
  `customer` varchar(200) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `vessel_name` varchar(200) DEFAULT NULL,
  `container_no` varchar(100) DEFAULT NULL,
  `seal_no` varchar(100) DEFAULT NULL,
  `bl_number` varchar(100) DEFAULT NULL,
  `port_loading` varchar(100) DEFAULT NULL,
  `port_discharge` varchar(100) DEFAULT NULL,
  `final_destination` varchar(200) DEFAULT NULL,
  `etd` date DEFAULT NULL,
  `eta` date DEFAULT NULL,
  `vehicle_no` varchar(50) DEFAULT NULL,
  `transporter` varchar(100) DEFAULT NULL,
  `eway_bill_no` varchar(100) DEFAULT NULL,
  `total_net_wt_kg` decimal(12,3) DEFAULT NULL,
  `total_gross_wt_kg` decimal(12,3) DEFAULT NULL,
  `mtc_cert_no` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Dispatched',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grade_code` varchar(20) NOT NULL,
  `c_min` decimal(5,3) DEFAULT NULL,
  `c_max` decimal(5,3) DEFAULT NULL,
  `mn_min` decimal(5,3) DEFAULT NULL,
  `mn_max` decimal(5,3) DEFAULT NULL,
  `p_max` decimal(6,4) DEFAULT NULL,
  `s_min` decimal(5,3) DEFAULT NULL,
  `s_max` decimal(5,3) DEFAULT NULL,
  `si_min` decimal(5,3) DEFAULT NULL,
  `si_max` decimal(5,3) DEFAULT NULL,
  `ni_min` decimal(5,3) DEFAULT NULL,
  `ni_max` decimal(5,3) DEFAULT NULL,
  `mo_min` decimal(5,3) DEFAULT NULL,
  `mo_max` decimal(5,3) DEFAULT NULL,
  `cr_min` decimal(5,3) DEFAULT NULL,
  `cr_max` decimal(5,3) DEFAULT NULL,
  `n_max` decimal(5,3) DEFAULT NULL,
  `cu_min` decimal(5,3) DEFAULT NULL,
  `cu_max` decimal(5,3) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grade_code` (`grade_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_card_no` varchar(20) NOT NULL,
  `stage_name` varchar(50) NOT NULL,
  `machine_code` varchar(30) DEFAULT NULL,
  `operator_name` varchar(100) DEFAULT NULL,
  `shift` enum('A','B','C') DEFAULT NULL,
  `qty_pcs_in` int DEFAULT NULL,
  `qty_pcs_out` int DEFAULT NULL,
  `qty_rejected` int DEFAULT '0',
  `weight_kg_in` decimal(10,3) DEFAULT NULL,
  `weight_kg_out` decimal(10,3) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `remarks` text,
  `logged_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_code` varchar(30) NOT NULL,
  `machine_name` varchar(100) NOT NULL,
  `stage_name` varchar(50) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `notes` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `machine_code` (`machine_code`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `operator_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `log_date` date NOT NULL,
  `shift` enum('DAY','NIGHT','GENERAL') DEFAULT 'DAY',
  `operator_name` varchar(100) NOT NULL,
  `emp_id` varchar(50) DEFAULT '',
  `machine_name` varchar(100) NOT NULL,
  `process` varchar(100) DEFAULT '',
  `grade` varchar(50) DEFAULT '',
  `heat_no` varchar(50) DEFAULT '',
  `input_size` decimal(8,2) DEFAULT '0.00',
  `output_size` decimal(8,2) DEFAULT '0.00',
  `finish_size` decimal(8,2) DEFAULT '0.00',
  `no_of_pcs` int DEFAULT '0',
  `black_qty_mt` decimal(10,4) DEFAULT '0.0000',
  `bright_qty_mt` decimal(10,4) DEFAULT '0.0000',
  `target_pcs_12hr` int DEFAULT '0',
  `actual_efficiency` decimal(6,2) DEFAULT '0.00',
  `target_efficiency` decimal(6,2) DEFAULT '100.00',
  `breakdown_mins` int DEFAULT '0',
  `downtime_mins` int DEFAULT '0',
  `delay_remarks` text,
  `customer` varchar(100) DEFAULT '',
  `source` enum('manual','excel','whatsapp') DEFAULT 'manual',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int DEFAULT NULL,
  `batch_card_no` varchar(20) DEFAULT NULL,
  `heat_no` varchar(50) DEFAULT NULL,
  `grade` varchar(100) DEFAULT NULL,
  `size_mm` decimal(10,2) DEFAULT NULL,
  `check_type` varchar(50) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `inspector` varchar(100) DEFAULT NULL,
  `pcs_received` int DEFAULT NULL,
  `ut_ok` int DEFAULT NULL,
  `ut_reject` int DEFAULT NULL,
  `mpi_reject` int DEFAULT NULL,
  `total_ok_pcs` int DEFAULT NULL,
  `end_cut_wt` decimal(10,3) DEFAULT NULL,
  `ok_wt_mt` decimal(10,3) DEFAULT NULL,
  `rej_wt_mt` decimal(10,3) DEFAULT NULL,
  `furnace_no` varchar(50) DEFAULT NULL,
  `hardness` varchar(50) DEFAULT NULL,
  `tensile` varchar(50) DEFAULT NULL,
  `result` enum('OK','Not OK','Pending') DEFAULT 'Pending',
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `so_number` varchar(50) NOT NULL,
  `so_date` date DEFAULT NULL,
  `po_number` varchar(50) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `supplier_no` varchar(50) DEFAULT NULL,
  `order_type` enum('Export','Domestic') DEFAULT 'Export',
  `currency` varchar(10) DEFAULT 'EUR',
  `customer` varchar(200) DEFAULT NULL,
  `customer_short_code` varchar(20) DEFAULT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `salesperson` varchar(100) DEFAULT NULL,
  `delivery_address` text,
  `consignee_address` text,
  `consignee` text,
  `kind_attention` varchar(100) DEFAULT NULL,
  `sale_made_through` varchar(100) DEFAULT NULL,
  `delivery_instruction` text,
  `shipment_mode` varchar(100) DEFAULT NULL,
  `payment_terms` text,
  `inco_term` varchar(100) DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `status` enum('Pending','In Production','Dispatched','On Hold') DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total_qty_tons` decimal(10,3) DEFAULT '0.000',
  `total_amount_euro` decimal(12,3) DEFAULT '0.000',
  `bank_charges` text,
  `notes` text,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `so_number` (`so_number`)
) ENGINE=InnoDB AUTO_INCREMENT=200 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `so_line_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `so_id` int NOT NULL,
  `so_number` varchar(50) DEFAULT NULL,
  `sr_no` int DEFAULT NULL,
  `description` text,
  `grade` varchar(20) DEFAULT NULL,
  `finish` varchar(100) DEFAULT NULL,
  `tolerance` varchar(10) DEFAULT NULL,
  `size_mm` decimal(10,2) DEFAULT NULL,
  `length_mm` varchar(50) DEFAULT NULL,
  `length_tolerance` varchar(20) DEFAULT '-0/+100',
  `ends_finish` varchar(50) DEFAULT 'Chamfered',
  `qty_tons` decimal(10,3) DEFAULT NULL,
  `rate_per_ton` decimal(10,2) DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `wooden_box` tinyint(1) DEFAULT '0',
  `rm_max_n_mm2` int DEFAULT NULL,
  `batch_card_no` varchar(50) DEFAULT NULL,
  `line_status` enum('Pending','Batch Created','In Production','Dispatched') DEFAULT 'Pending',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `qty_unit` varchar(10) DEFAULT 'tons',
  `price_unit` varchar(20) DEFAULT 'EUR/ton',
  PRIMARY KEY (`id`),
  KEY `so_id` (`so_id`),
  CONSTRAINT `so_line_items_ibfk_1` FOREIGN KEY (`so_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=250 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `so_number_sequence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prefix` varchar(30) DEFAULT 'AIMPL/S.O/EXP',
  `financial_year` varchar(10) DEFAULT '2025-26',
  `last_number` int DEFAULT '87',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `so_quality_specs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `so_number` varchar(50) NOT NULL,
  `product_standard` varchar(50) DEFAULT 'EN 10088-3-2014',
  `heat_treatment` varchar(100) DEFAULT NULL,
  `tolerance_class` varchar(10) DEFAULT 'h9',
  `packing_spec` text,
  `ut_standard` varchar(100) DEFAULT NULL,
  `ut_class_notes` text,
  `surface_test` varchar(100) DEFAULT NULL,
  `mechanical_test` varchar(50) DEFAULT '100% UT/MPI',
  `mtc_standard` varchar(50) DEFAULT 'EN 10204/3.1',
  `radioactivity_free` tinyint(1) DEFAULT '1',
  `sulphur_min` decimal(5,3) DEFAULT NULL,
  `weight_tolerance_pct` int DEFAULT '10',
  `cbam_applicable` tinyint(1) DEFAULT '0',
  `cbam_liability` varchar(50) DEFAULT NULL,
  `cbam_data_provided` tinyint(1) DEFAULT '0',
  `doc_commercial_invoice` int DEFAULT '3',
  `doc_packing_list` int DEFAULT '3',
  `doc_bill_of_lading` varchar(50) DEFAULT 'Full set original',
  `doc_insurance_pct` int DEFAULT '110',
  `doc_origin_certificate` int DEFAULT '2',
  `doc_fumigation_cert` int DEFAULT '1',
  `doc_radioactive_cert` int DEFAULT '1',
  `doc_material_analysis` int DEFAULT '2',
  `doc_mechanical_test` int DEFAULT '2',
  `short_code_on_docs` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `so_number` (`so_number`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stage_capacity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `stage_name` varchar(50) NOT NULL,
  `capacity_mt_per_day` decimal(6,2) DEFAULT '25.00',
  `is_fixed_days` tinyint(1) DEFAULT '0',
  `fixed_days` int DEFAULT NULL,
  `notes` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stage_name` (`stage_name`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stage_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `stage` varchar(100) DEFAULT NULL,
  `operator` varchar(100) DEFAULT NULL,
  `machine` varchar(100) DEFAULT NULL,
  `shift` varchar(10) DEFAULT NULL,
  `input_size` decimal(10,2) DEFAULT NULL,
  `output_size` decimal(10,2) DEFAULT NULL,
  `ovality` decimal(10,3) DEFAULT NULL,
  `remarks` text,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `duration_mins` int DEFAULT NULL,
  `logged_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `stage_logs_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

