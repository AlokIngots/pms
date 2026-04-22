from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import anthropic
import base64
import json

load_dotenv()

app = Flask(__name__)

# ── CORS: restrict to known origins ──────────────
_cors_origins = [
    o.strip() for o in os.getenv(
        'CORS_ORIGINS',
        'https://pms.alokindia.co.in,http://localhost:5173,http://localhost:8080'
    ).split(',') if o.strip()
]
CORS(app, resources={r"/api/*": {"origins": _cors_origins}}, supports_credentials=True)

# ── Existing routes ──────────────────────────────
from routes.batches       import batches_bp
from routes.orders        import orders_bp
from routes.qc            import qc_bp
from routes.dispatch      import dispatch_bp
from routes.dashboard     import dashboard_bp
from routes.logs          import logs_bp
from routes.reports       import reports_bp
from routes.batch_cards   import batch_cards_bp
from routes.operator_logs import operator_logs_bp
from routes.batch_card_pdf import batch_card_bp
from routes.scan_routes import scan_bp
from routes.packing_list import packing_list_bp
# ── New routes ───────────────────────────────────
from routes.so_creation   import so_creation_bp
from routes.crm_sync      import crm_sync_bp, start_crm_polling
from routes.so_pdf        import so_pdf_bp
from routes.master_data   import master_bp
from routes.commercial_invoice import ci_pdf_bp
from routes.so_detail import so_detail_bp
from routes.so_pdf_local import so_pdf_local_bp

# ── Register all blueprints ──────────────────────
for bp in (
    operator_logs_bp, batches_bp, orders_bp, qc_bp, dispatch_bp,
    dashboard_bp, logs_bp, reports_bp, batch_cards_bp, scan_bp,
    packing_list_bp, so_creation_bp, crm_sync_bp, so_pdf_bp,
    master_bp, ci_pdf_bp, batch_card_bp, so_detail_bp, so_pdf_local_bp,
):
    app.register_blueprint(bp)

# ── Health check ─────────────────────────────────
@app.route('/api/health')
def health():
    return {'status': 'ok', 'message': 'Alok PMS backend running'}

# ── PDF / SO extraction ──────────────────────────
@app.route('/api/extract-so', methods=['POST'])
def extract_so():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if not file.filename:
            return jsonify({'error': 'Empty filename'}), 400

        file_bytes = file.read()
        file_b64   = base64.standard_b64encode(file_bytes).decode('utf-8')

        filename = file.filename.lower()
        if filename.endswith('.pdf'):
            media_type  = 'application/pdf'
            source_type = 'document'
        elif filename.endswith(('.jpg', '.jpeg')):
            media_type  = 'image/jpeg'
            source_type = 'image'
        elif filename.endswith('.png'):
            media_type  = 'image/png'
            source_type = 'image'
        else:
            media_type  = 'application/pdf'
            source_type = 'document'

        client  = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        message = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=2000,
            messages=[{
                'role': 'user',
                'content': [
                    {
                        'type': source_type,
                        'source': {
                            'type': 'base64',
                            'media_type': media_type,
                            'data': file_b64,
                        },
                    },
                    {
                        'type': 'text',
                        'text': '''Extract all sales order / sales contract data from this document.
Return ONLY a valid JSON object with these exact fields, no markdown, no preamble:
{
  "so_number": "",
  "so_date": "YYYY-MM-DD",
  "po_number": "",
  "po_date": "YYYY-MM-DD",
  "supplier_no": "",
  "order_type": "Export",
  "currency": "EUR",
  "customer": "",
  "delivery_address": "",
  "consignee_address": "",
  "kind_attention": "",
  "sale_made_through": "",
  "delivery_instruction": "",
  "payment_terms": "",
  "inco_term": "",
  "delivery_date": "YYYY-MM-DD",
  "line_items": [
    {
      "sr_no": 1,
      "description": "",
      "grade": "",
      "size_mm": 0,
      "tolerance": "h9",
      "length_mm": 3000,
      "finish": "",
      "ends_finish": "Chamfered",
      "qty_tons": 0,
      "rate_per_ton": 0,
      "amount": 0
    }
  ]
}
Extract ALL line items. Use YYYY-MM-DD date format. Return only valid JSON.'''
                    }
                ],
            }],
        )

        text = message.content[0].text.strip()
        if text.startswith('```'):
            text = text.split('```')[1]
            if text.startswith('json'):
                text = text[4:]
        text = text.strip()

        extracted = json.loads(text)
        return jsonify(extracted)

    except json.JSONDecodeError as e:
        return jsonify({'error': f'Could not parse AI response: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Start CRM polling thread (gunicorn-safe) ─────
# With gunicorn --preload, this runs once in the master before workers fork.
# Without --preload, it would run per-worker (= duplicate CRM hits).
def _maybe_start_polling():
    if os.getenv('ENABLE_CRM_POLLING', 'true').lower() == 'true':
        if os.getenv('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
            start_crm_polling()

_maybe_start_polling()


if __name__ == '__main__':
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(debug=debug, host='0.0.0.0', port=5000)
