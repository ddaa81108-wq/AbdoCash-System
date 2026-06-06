import os
from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# الاتصال بقاعدة بيانات MongoDB
mongo_uri = os.getenv('MONGO_URI')
if not mongo_uri:
    raise ValueError("No MONGO_URI found in environment variables")

client = MongoClient(mongo_uri)
db = client['AbdoFinancialDB']

# تحديد المجموعات
db_system_data = db['system_data']


@app.route('/')
def index():
    return render_template('index.html')

# 1. جلب البيانات المالية الأساسية بالكامل بدون فلاتر التاريخ
@app.route('/api/load_data', methods=['GET'])
def load_data():
    try:
        data = db_system_data.find_one({}, {'_id': 0})
        if data:
            return jsonify({"status": "success", "data": data})
        else:
            return jsonify({"status": "empty", "message": "لا توجد بيانات محفوظة بعد"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# 2. حفظ البيانات
@app.route('/api/save_data', methods=['POST'])
def save_data():
    try:
        incoming_data = request.json
        if not incoming_data:
            return jsonify({"status": "error", "message": "لم يتم إرسال بيانات"})

        db_system_data.update_one({}, {"$set": incoming_data}, upsert=True)
        return jsonify({"status": "success", "message": "تم الحفظ في MongoDB بنجاح"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
