from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
import sqlite3
import os
from datetime import datetime, date
import calendar

app = Flask(__name__)
app.secret_key = "yoga_secret_key_2026"


@app.context_processor
def inject_now():
    return {"now": datetime.now().strftime("%d %b %Y")}

DB_PATH = os.path.join(os.path.dirname(__file__), "yoga.db")


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS students (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT    NOT NULL,
                phone       TEXT,
                email       TEXT,
                address     TEXT,
                fee_amount  REAL    NOT NULL DEFAULT 0,
                join_date   TEXT    NOT NULL,
                active      INTEGER NOT NULL DEFAULT 1,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS payments (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                amount       REAL    NOT NULL,
                month        TEXT    NOT NULL,   -- 'YYYY-MM'
                paid_date    TEXT    NOT NULL,
                note         TEXT,
                created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS attendance (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                att_date    TEXT    NOT NULL,   -- 'YYYY-MM-DD'
                present     INTEGER NOT NULL DEFAULT 1,
                UNIQUE(student_id, att_date)
            );
        """)


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

@app.route("/")
def dashboard():
    today = date.today()
    current_month = today.strftime("%Y-%m")
    with get_db() as conn:
        total_students   = conn.execute("SELECT COUNT(*) FROM students WHERE active=1").fetchone()[0]
        total_collected  = conn.execute(
            "SELECT COALESCE(SUM(amount),0) FROM payments WHERE month=?", (current_month,)
        ).fetchone()[0]
        total_expected   = conn.execute(
            "SELECT COALESCE(SUM(fee_amount),0) FROM students WHERE active=1"
        ).fetchone()[0]
        pending          = total_expected - total_collected

        # students who have NOT paid this month
        unpaid_students = conn.execute("""
            SELECT s.id, s.name, s.phone, s.fee_amount
            FROM students s
            WHERE s.active = 1
              AND s.id NOT IN (
                  SELECT student_id FROM payments WHERE month = ?
              )
            ORDER BY s.name
        """, (current_month,)).fetchall()

        # recent payments (last 10)
        recent_payments = conn.execute("""
            SELECT p.*, s.name as student_name
            FROM payments p
            JOIN students s ON s.id = p.student_id
            ORDER BY p.paid_date DESC, p.id DESC
            LIMIT 10
        """).fetchall()

        # monthly summary for the last 6 months
        monthly_summary = []
        for i in range(5, -1, -1):
            y = today.year
            m = today.month - i
            while m <= 0:
                m += 12
                y -= 1
            label = f"{y}-{m:02d}"
            collected = conn.execute(
                "SELECT COALESCE(SUM(amount),0) FROM payments WHERE month=?", (label,)
            ).fetchone()[0]
            monthly_summary.append({"month": label, "collected": collected})

    return render_template("dashboard.html",
        total_students=total_students,
        total_collected=total_collected,
        total_expected=total_expected,
        pending=pending,
        unpaid_students=unpaid_students,
        recent_payments=recent_payments,
        monthly_summary=monthly_summary,
        current_month=current_month
    )


@app.route("/students")
def students():
    with get_db() as conn:
        all_students = conn.execute(
            "SELECT * FROM students ORDER BY active DESC, name"
        ).fetchall()
    return render_template("students.html", students=all_students)


@app.route("/payments")
def payments():
    months_back = 6
    today = date.today()
    month_list = []
    for i in range(months_back - 1, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        month_list.append(f"{y}-{m:02d}")

    selected_month = request.args.get("month", today.strftime("%Y-%m"))

    with get_db() as conn:
        paid_students = conn.execute("""
            SELECT s.id, s.name, s.phone, s.fee_amount,
                   p.amount as paid_amount, p.paid_date, p.id as payment_id, p.note
            FROM payments p
            JOIN students s ON s.id = p.student_id
            WHERE p.month = ?
            ORDER BY s.name
        """, (selected_month,)).fetchall()

        unpaid_students = conn.execute("""
            SELECT s.id, s.name, s.phone, s.fee_amount
            FROM students s
            WHERE s.active = 1
              AND s.id NOT IN (
                  SELECT student_id FROM payments WHERE month = ?
              )
            ORDER BY s.name
        """, (selected_month,)).fetchall()

        all_students = conn.execute(
            "SELECT id, name FROM students WHERE active=1 ORDER BY name"
        ).fetchall()

    return render_template("payments.html",
        paid_students=paid_students,
        unpaid_students=unpaid_students,
        all_students=all_students,
        selected_month=selected_month,
        month_list=month_list
    )


@app.route("/attendance")
def attendance():
    today = date.today()
    selected_date = request.args.get("date", today.strftime("%Y-%m-%d"))

    with get_db() as conn:
        all_students = conn.execute(
            "SELECT * FROM students WHERE active=1 ORDER BY name"
        ).fetchall()
        present_ids = {
            row["student_id"]
            for row in conn.execute(
                "SELECT student_id FROM attendance WHERE att_date=? AND present=1",
                (selected_date,)
            ).fetchall()
        }

    return render_template("attendance.html",
        students=all_students,
        selected_date=selected_date,
        present_ids=present_ids
    )


# ---------------------------------------------------------------------------
# API – Students
# ---------------------------------------------------------------------------

@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.get_json()
    name       = data.get("name", "").strip()
    phone      = data.get("phone", "").strip()
    email      = data.get("email", "").strip()
    address    = data.get("address", "").strip()
    fee_amount = float(data.get("fee_amount", 0))
    join_date  = data.get("join_date", date.today().isoformat())

    if not name:
        return jsonify({"error": "Name is required"}), 400

    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO students (name,phone,email,address,fee_amount,join_date) VALUES (?,?,?,?,?,?)",
            (name, phone, email, address, fee_amount, join_date)
        )
        conn.commit()
        student_id = cur.lastrowid

    return jsonify({"success": True, "id": student_id}), 201


@app.route("/api/students/<int:sid>", methods=["PUT"])
def update_student(sid):
    data = request.get_json()
    with get_db() as conn:
        conn.execute("""
            UPDATE students SET name=?, phone=?, email=?, address=?,
                                fee_amount=?, join_date=?, active=?
            WHERE id=?
        """, (
            data.get("name"), data.get("phone"), data.get("email"),
            data.get("address"), float(data.get("fee_amount", 0)),
            data.get("join_date"), int(data.get("active", 1)), sid
        ))
        conn.commit()
    return jsonify({"success": True})


@app.route("/api/students/<int:sid>", methods=["DELETE"])
def delete_student(sid):
    with get_db() as conn:
        conn.execute("DELETE FROM students WHERE id=?", (sid,))
        conn.commit()
    return jsonify({"success": True})


@app.route("/api/students/<int:sid>")
def get_student(sid):
    with get_db() as conn:
        s = conn.execute("SELECT * FROM students WHERE id=?", (sid,)).fetchone()
    if not s:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(s))


# ---------------------------------------------------------------------------
# API – Payments
# ---------------------------------------------------------------------------

@app.route("/api/payments", methods=["POST"])
def add_payment():
    data       = request.get_json()
    student_id = int(data.get("student_id"))
    amount     = float(data.get("amount"))
    month      = data.get("month")          # 'YYYY-MM'
    paid_date  = data.get("paid_date", date.today().isoformat())
    note       = data.get("note", "")

    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO payments (student_id,amount,month,paid_date,note) VALUES (?,?,?,?,?)",
            (student_id, amount, month, paid_date, note)
        )
        conn.commit()
    return jsonify({"success": True, "id": cur.lastrowid}), 201


@app.route("/api/payments/<int:pid>", methods=["DELETE"])
def delete_payment(pid):
    with get_db() as conn:
        conn.execute("DELETE FROM payments WHERE id=?", (pid,))
        conn.commit()
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# API – Attendance
# ---------------------------------------------------------------------------

@app.route("/api/attendance", methods=["POST"])
def save_attendance():
    data          = request.get_json()
    att_date      = data.get("date")
    present_ids   = set(data.get("present_ids", []))
    student_ids   = data.get("student_ids", [])

    with get_db() as conn:
        for sid in student_ids:
            present = 1 if sid in present_ids else 0
            conn.execute("""
                INSERT INTO attendance (student_id, att_date, present)
                VALUES (?, ?, ?)
                ON CONFLICT(student_id, att_date) DO UPDATE SET present=excluded.present
            """, (sid, att_date, present))
        conn.commit()

    return jsonify({"success": True})


@app.route("/api/attendance/report")
def attendance_report():
    student_id = request.args.get("student_id")
    month      = request.args.get("month", date.today().strftime("%Y-%m"))
    with get_db() as conn:
        rows = conn.execute("""
            SELECT att_date, present FROM attendance
            WHERE student_id=? AND att_date LIKE ?
            ORDER BY att_date
        """, (student_id, f"{month}%")).fetchall()
    return jsonify([dict(r) for r in rows])


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
