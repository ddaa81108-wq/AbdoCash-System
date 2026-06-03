from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient

app = Flask(__name__)

# الاتصال بقاعدة بيانات MongoDB محلياً على جهازك
# سيتم إنشاء قاعدة البيانات باسم AbdoFinancialDB تلقائياً
client = MongoClient('mongodb+srv://abdo:654321asdfgh@cluster0.ubknokp.mongodb.net/?appName=Cluster0')
db = client['AbdoFinancialDB']

# تحديد المجموعات (Collections) جوه قاعدة البيانات
db_system_data = db['system_data'] # لحفظ البيانات المالية (sysDB)
db_users_auth = db['users_auth']   # لحفظ الحسابات والصلاحيات

@app.route('/')
def index():
    return render_template('index.html')

# 1. رابط لجلب البيانات المالية من قاعدة البيانات عند فتح المنظومة
@app.route('/api/load_data', methods=['GET'])
def load_data():
    try:
        # البحث عن آخر نسخة بيانات محفوظة
        data = db_system_data.find_one({}, {'_id': 0})
        if data:
            return jsonify({"status": "success", "data": data})
        else:
            return jsonify({"status": "empty", "message": "لا توجد بيانات محفوظة بعد"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# 2. رابط لاستقبال البيانات المالية من المنظومة وحفظها في قاعدة البيانات
@app.route('/api/save_data', methods=['POST'])
def save_data():
    try:
        incoming_data = request.json
        if not incoming_data:
            return jsonify({"status": "error", "message": "لم يتم إرسال بيانات"})
        
        # تحديث البيانات القديمة أو إدخالها لو مش موجودة
        db_system_data.update_one({}, {"$set": incoming_data}, upsert=True)
        return jsonify({"status": "success", "message": "تم حفظ البيانات في MongoDB بنجاح"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)