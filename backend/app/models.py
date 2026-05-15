"""Database models for Cylinder Inspection Management System."""

from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Float, Date, DateTime,
    ForeignKey, Boolean, Enum, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import enum

Base = declarative_base()


# ── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    WORKER = "worker"
    OBSERVER = "observer"


class CylinderStatus(str, enum.Enum):
    ACTIVE = "active"           # установлен на автобусе
    IN_STOCK = "in_stock"       # на складе
    INSPECTION = "inspection"   # на обследовании
    REJECTED = "rejected"       # забракован
    DECOMMISSIONED = "decommissioned"  # списан


class InspectionType(str, enum.Enum):
    STANDARD = "standard"       # стандартное освидетельствование
    EXTENDED = "extended"       # расширенное (с дефектоскопией)
    HYDRAULIC = "hydraulic"     # гидравлическое испытание
    PNEUMATIC = "pneumatic"     # пневматическое испытание


class InspectionResult(str, enum.Enum):
    PASS = "pass"
    FAIL = "fail"
    PENDING = "pending"


class TransactionType(str, enum.Enum):
    IN = "in"
    OUT = "out"
    RESERVED = "reserved"


# ── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.WORKER, nullable=False)
    fleet_id = Column(Integer, ForeignKey("fleets.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    fleet = relationship("Fleet", backref="users", lazy="joined")


class Fleet(Base):
    __tablename__ = "fleets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, unique=True)
    address = Column(String(500), nullable=True)
    responsible = Column(String(200), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    buses = relationship("Bus", backref="fleet", lazy="joined",
                         cascade="all, delete-orphan")
    cylinders = relationship("Cylinder", backref="fleet", lazy="joined")
    stock_items = relationship("StockItem", backref="fleet", lazy="joined")


class Bus(Base):
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fleet_id = Column(Integer, ForeignKey("fleets.id"), nullable=False, index=True)
    gosnomer = Column(String(20), nullable=False)
    board_number = Column(String(50), nullable=True)
    vin = Column(String(50), nullable=True)
    model = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cylinders = relationship("Cylinder", backref="bus", lazy="joined")
    repairs = relationship("Repair", backref="bus", lazy="joined")


class Cylinder(Base):
    __tablename__ = "cylinders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fleet_id = Column(Integer, ForeignKey("fleets.id"), nullable=False, index=True)
    bus_id = Column(Integer, ForeignKey("buses.id"), nullable=True)

    number = Column(String(100), nullable=False)       # номер баллона
    stamp = Column(String(200), nullable=True)          # клеймо
    serial_number = Column(String(100), nullable=True)  # серийный номер
    gas_type = Column(String(50), nullable=True)        # тип газа
    manufactured_date = Column(Date, nullable=True)     # дата изготовления
    capacity_liters = Column(Float, nullable=True)      # объём, л
    working_pressure = Column(Float, nullable=True)     # рабочее давление, МПа
    test_pressure = Column(Float, nullable=True)        # пробное давление, МПа
    tare_weight = Column(Float, nullable=True)          # масса, кг
    status = Column(Enum(CylinderStatus), default=CylinderStatus.ACTIVE)
    next_inspection_date = Column(Date, nullable=True)
    photo_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    inspections = relationship("Inspection", backref="cylinder",
                               lazy="joined", cascade="all, delete-orphan",
                               order_by="Inspection.inspection_date.desc()")
    repairs = relationship("Repair", backref="cylinder", lazy="joined")


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cylinder_id = Column(Integer, ForeignKey("cylinders.id"), nullable=False, index=True)

    inspection_date = Column(Date, nullable=False)
    inspection_type = Column(Enum(InspectionType), default=InspectionType.STANDARD)
    result = Column(Enum(InspectionResult), default=InspectionResult.PENDING)

    next_inspection_date = Column(Date, nullable=True)
    inspector = Column(String(200), nullable=True)

    # Standard tests
    visual_inspection = Column(Boolean, default=False)
    hydraulic_test = Column(Boolean, default=False)
    pneumatic_test = Column(Boolean, default=False)
    weight_check = Column(Boolean, default=False)
    ultrasonic_thickness = Column(Boolean, default=False)

    # Extended tests (при выявленных проблемах)
    defectoscopy = Column(Boolean, default=False)
    powder_test = Column(Boolean, default=False)
    magnetic_test = Column(Boolean, default=False)

    pressure_achieved = Column(Float, nullable=True)     # достигнутое давление
    wall_thickness = Column(Float, nullable=True)         # толщина стенки, мм
    weight_measured = Column(Float, nullable=True)        # измеренная масса
    notes = Column(Text, nullable=True)
    photo_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


    @property
    def cylinder_number(self):
        if hasattr(self, '_cylinder_number'):
            return self._cylinder_number
        return self.cylinder.number if self.cylinder else None

class Repair(Base):
    __tablename__ = "repairs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cylinder_id = Column(Integer, ForeignKey("cylinders.id"), nullable=True)
    bus_id = Column(Integer, ForeignKey("buses.id"), nullable=True)
    fleet_id = Column(Integer, ForeignKey("fleets.id"), nullable=False, index=True)

    repair_date = Column(Date, default=date.today)
    description = Column(Text, nullable=False)
    parts_replaced = Column(Text, nullable=True)    # JSON список заменённых частей
    cost = Column(Float, nullable=True)
    technician = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StockItem(Base):
    __tablename__ = "stock_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fleet_id = Column(Integer, ForeignKey("fleets.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=True)
    quantity = Column(Float, default=0)
    unit = Column(String(20), default="шт")
    min_quantity = Column(Float, default=0)
    price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=False)
    fleet_id = Column(Integer, ForeignKey("fleets.id"), nullable=False, index=True)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    quantity = Column(Float, nullable=False)
    date = Column(Date, default=date.today)
    related_repair_id = Column(Integer, ForeignKey("repairs.id"), nullable=True)
    comment = Column(Text, nullable=True)

    stock_item = relationship("StockItem", backref="transactions")


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notify_1month = Column(Boolean, default=True)
    notify_1week = Column(Boolean, default=True)
    notify_3months = Column(Boolean, default=True)
    notify_overdue = Column(Boolean, default=True)
    telegram_bot_token = Column(String(255), nullable=True)
    telegram_chat_id = Column(String(255), nullable=True)

    user = relationship("User", backref="notification_settings")
