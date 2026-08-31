import pandas as pd
import json

try:
    # Read all sheets from the excel file
    file_path = r"C:\field-senses-app-main\Main Logicon\ATS Observations.xlsx"
    excel_data = pd.read_excel(file_path, sheet_name=None)
    
    output = {}
    for sheet_name, df in excel_data.items():
        # Fill NaN with empty string for cleaner output
        df = df.fillna('')
        output[sheet_name] = df.to_dict(orient='records')
        
    print(json.dumps(output, indent=2))
except Exception as e:
    print(f"Error reading Excel file: {e}")
