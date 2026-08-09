from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.models.attendance import Attendance
from app.models.member import Member
from app.schemas.attendance import AttendanceCreate, AttendanceResponse, AttendanceReportEntry

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)


@router.get("/", response_model=List[AttendanceResponse])
def get_attendance(
    att_date: date = Query(default=None),
    member_id: int = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(Attendance)
    if att_date:
        q = q.filter(Attendance.att_date == att_date)
    if member_id:
        q = q.filter(Attendance.member_id == member_id)
    return q.order_by(Attendance.att_date.desc()).all()


@router.post("/", response_model=AttendanceResponse, status_code=201)
def mark_attendance(entry: AttendanceCreate, db: Session = Depends(get_db)):
    member = db.query(Member).filter(
        Member.id == entry.member_id,
        Member.is_active == True  # noqa: E712
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Active member not found")

    # Upsert: update existing record for the same member+date if it exists
    existing = db.query(Attendance).filter(
        Attendance.member_id == entry.member_id,
        Attendance.att_date == entry.att_date,
    ).first()

    if existing:
        existing.present = entry.present
        db.commit()
        db.refresh(existing)
        return existing

    record = Attendance(
        member_id=entry.member_id,
        att_date=entry.att_date,
        present=entry.present,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{attendance_id}")
def delete_attendance(attendance_id: int, db: Session = Depends(get_db)):
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(record)
    db.commit()
    return {"message": "Attendance record deleted"}


@router.get("/report", response_model=List[AttendanceReportEntry])
def attendance_report(
    month: str = Query(..., description="YYYY-MM"),
    db: Session = Depends(get_db),
):
    """Returns per-member attendance summary for a given month."""
    year, mon = map(int, month.split("-"))
    members = db.query(Member).filter(Member.is_active == True).all()  # noqa: E712

    report = []
    for m in members:
        records = (
            db.query(Attendance)
            .filter(
                Attendance.member_id == m.id,
                func.extract("year", Attendance.att_date) == year,
                func.extract("month", Attendance.att_date) == mon,
            )
            .all()
        )
        present_days = sum(1 for r in records if r.present)
        absent_days = sum(1 for r in records if not r.present)
        report.append(
            AttendanceReportEntry(
                member_id=m.id,
                member_name=f"{m.first_name} {m.last_name}",
                present_days=present_days,
                absent_days=absent_days,
                total_days=present_days + absent_days,
            )
        )
    return report
