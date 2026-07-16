import sqlite3
import json

OLD_DB = r'C:\field-senses-app-main\backend\db.sqlite3'
NEW_DB = r'C:\field-senses-app-main\Main Logicon\BE-Logicon-connect-ATS-main\db.sqlite3'

def migrate():
    print("Connecting to databases...")
    conn_old = sqlite3.connect(OLD_DB)
    conn_new = sqlite3.connect(NEW_DB)
    
    # Read from old
    cursor_old = conn_old.cursor()
    cursor_old.execute("SELECT * FROM attendance_attendancerecord")
    records = cursor_old.fetchall()
    
    # Get column names
    col_names = [desc[0] for desc in cursor_old.description]
    print(f"Found {len(records)} records in old database.")
    
    if len(records) == 0:
        print("No records to migrate.")
        return

    cursor_new = conn_new.cursor()
    
    # Map old columns to new columns
    # old: "id", "date", "check_in_time", "check_in_lat", "check_in_lng", "check_in_address", "check_in_photo", "check_out_time", "check_out_lat", "check_out_lng", "check_out_address", "check_out_photo", "total_hours", "created_at", "updated_at", "employee_id"
    
    inserted = 0
    for row in records:
        row_dict = dict(zip(col_names, row))
        
        # New columns
        check_in_at = row_dict['check_in_time']
        check_out_at = row_dict['check_out_time']
        
        # In old db date is shift_date
        shift_date = row_dict['date']
        status = 'closed' if check_out_at else 'active'
        
        total_hours = row_dict['total_hours'] or 0.0
        
        try:
            cursor_new.execute("""
                INSERT INTO attendance_attendancesession (
                    id, created_at, updated_at, 
                    check_in_at, check_in_lat, check_in_lng, check_in_address, 
                    check_in_photo, check_in_device_info, 
                    check_out_at, check_out_lat, check_out_lng, check_out_address, 
                    check_out_photo, check_out_device_info, 
                    status, total_hours, overtime_hours, break_minutes, 
                    shift_date, auto_closed, manual_override_reason, employee_id
                ) VALUES (
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, '{}',
                    ?, ?, ?, ?,
                    ?, '{}',
                    ?, ?, 0, 0,
                    ?, 0, '', ?
                )
            """, (
                row_dict['id'], row_dict['created_at'], row_dict['updated_at'],
                check_in_at, row_dict['check_in_lat'] or 0.0, row_dict['check_in_lng'] or 0.0, row_dict['check_in_address'] or '',
                row_dict['check_in_photo'],
                check_out_at, row_dict['check_out_lat'], row_dict['check_out_lng'], row_dict['check_out_address'] or '',
                row_dict['check_out_photo'],
                status, total_hours,
                shift_date, row_dict['employee_id']
            ))
            inserted += 1
        except Exception as e:
            print(f"Error inserting record {row_dict['id']}: {e}")
            
    conn_new.commit()
    print(f"Successfully migrated {inserted} records.")

if __name__ == '__main__':
    migrate()
