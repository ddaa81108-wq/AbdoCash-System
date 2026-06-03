from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient

app = Flask(__name__)

# الاتصال بقاعدة بيانات MongoDB محلياً
client = MongoClient('mongodb+srv://abdo:654321asdfgh@cluster0.ubknokp.mongodb.net/?appName=Cluster0')
db = client['AbdoFinancialDB']

db_system_data = db['system_data']
db_users_auth = db['users_auth']

@app.route('/')
def index():
    return render_template('index.html')

# 1. جلب البيانات المالية الأساسية بالكامل
@app.route('/api/load_data', methods=['GET'])
def load_data():
    try:
        # جلب البيانات الأصلية لضمان ظهور كل ديون العملاء والشركات
        data = db_system_data.find_one({}, {'_id': 0}, sort=[('_id', 1)])
        if data:
            return jsonify({"status": "success", "data": data})
        else:
            return jsonify({"status": "empty", "message": "لا توجد بيانات محفوظة بعد"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# 2. حفظ البيانات فوق الملف الأصلي بشكل مباشر
@app.route('/api/save_data', methods=['POST'])
def save_data():
    try:
        incoming_data = request.json
        if not incoming_data:
            return jsonify({"status": "error", "message": "لم يتم إرسال بيانات"})
        
        db_system_data.update_one({}, {"$set": incoming_data}, upsert=True)
        return jsonify({"status": "success", "message": "تم الحفظ بنجاح"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
