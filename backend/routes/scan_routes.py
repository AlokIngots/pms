from flask import Blueprint, request, jsonify
from datetime import datetime
from db import get_db, rows_to_list, row_to_dict
from utils.shift_calc import get_shift

scan_bp = Blueprint("scan_bp", __name__)

# Standard production flow
STANDARD_FLOW = [
    "Black Bar Inspection", "HT Process", "Black Bar Str.",
    "Peeling", "Bright Bar Str.", "Grinding", "Cutting",
    "Chamfering", "Polishing", "MPI Final", "Packing"
]

# Which stages are QC checks (write to qc_records table)
QC_STAGES = {"Black Bar Inspection", "HT Process", "MPI Final"}

# Map our stage names to qc_records.check_type values
QC_CHECK_TYPE_MAP = {
    "Black Bar Inspection": "UT Inspection",
    "HT Process": "HT Process",
    "MPI Final": "MPI Final"
}

STAGE_FIELDS = {
    "Black Bar Inspection": [
        {"name": "pcs_received", "label": "Pcs Received", "type": "number"},
        {"name": "ut_ok", "label": "UT OK Pcs", "type": "number"},
        {"name": "ut_reject", "label": "UT Reject Pcs", "type": "number"},
        {"name": "mpi_reject", "label": "MPI Reject Pcs", "type": "number"},
        {"name": "total_ok_pcs", "label": "Total OK Pcs", "type": "number"},
        {"name": "end_cut_wt", "label": "End Cut WT (kg)", "type": "number", "step": "0.001"},
        {"name": "ok_wt_mt", "label": "OK Weight (MT)", "type": "number", "step": "0.001"},
        {"name": "rej_wt_mt", "label": "Rej Weight (MT)", "type": "number", "step": "0.001"},
        {"name": "result", "label": "Result", "type": "select", "options": ["OK", "Not OK", "Pending"]},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
    "HT Process": [
        {"name": "furnace_no", "label": "Furnace No", "type": "text"},
        {"name": "pcs_received", "label": "No of Pcs", "type": "number"},
        {"name": "hardness", "label": "Hardness", "type": "text"},
        {"name": "tensile", "label": "Tensile", "type": "text"},
        {"name": "result", "label": "Result", "type": "select", "options": ["OK", "Not OK", "Pending"]},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
    "Black Bar Str.": [
        {"name": "no_of_pcs", "label": "No of Pcs", "type": "number"},
        {"name": "input_size", "label": "Input Size (mm)", "type": "number", "step": "0.01"},
        {"name": "output_size", "label": "Output Size (mm)", "type": "number", "step": "0.01"},
        {"name": "ovality", "label": "Ovality", "type": "number", "step": "0.001"},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
    "Peeling": [
        {"name": "no_of_pcs", "label": "No of Pcs", "type": "number"},
        {"name": "input_size", "label": "Input Size (mm)", "type": "number", "step": "0.01"},
        {"name": "output_size", "label": "Output Size (mm)", "type": "number", "step": "0.01"},
        {"name": "ovality", "label": "Ovality", "type": "number", "step": "0.001"},
        {"name": "turning_loss_wt", "label": "Turning Loss Wt (kg)", "type": "number", "step": "0.01"},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
    "Bright Bar Str.": [
        {"name": "no_of_pcs", "label": "No of Pcs", "type": "number"},
        {"name": "input_size", "label": "Input Size (mm)", "type": "number", "step": "0.01"},
        {"name": "output_size", "label": "Output Size (mm)", "type": "number", "step": "0.01"},
        {"name": "ovality", "label": "Ovality", "type": "number", "step": "0.001"},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
    "Grinding": [
        {"name": "no_of_pcs", "label": "No of Pcs", "type": "number"},
        {"name": "input_size", "label": "Input Size (mm)", "type": "number", "step": "0.01"},
        {"name": "output_size", "label": "Output Size (mm)", "type": "number", "step": "0.01"},
        {"name": "ovality", "label": "Ovality", "type": "number", "step": "0.001"},
        {"name": "grinding_loss_wt", "label": "Grinding Loss Wt (kg)", "type": "number", "step": "0.01"},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
    "Cutting": [
        {"name": "no_of_pcs", "label": "No of Pcs", "type": "number"},
        {"name": "input_length", "label": "Input Length (mm)", "type": "number", "step": "0.01"},
        {"name": "finish_length", "label": "Finish Length (mm)", "type": "number", "step": "0.01"},
        {"name": "ovality", "label": "Ovality", "type": "number", "step": "0.001"},
        {"name": "end_cut_wt", "label": "End Cut Wt (kg)", "type": "number", "step": "0.01"},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
    "Chamfering": [
        {"name": "no_of_pcs", "label": "No of Pcs", "type": "number"},
        {"name": "input_size", "label": "Input Size (mm)", "type": "number", "step": "0.01"},
        {"name": "output_size", "label": "Output Size (mm)", "type": "number", "step": "0.01"},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
    "Polishing": [
        {"name": "no_of_pcs", "label": "No of Pcs", "type": "number"},
        {"name": "input_size", "label": "Input Size (mm)", "type": "number", "step": "0.01"},
        {"name": "ra_value", "label": "Ra Value", "type": "number", "step": "0.01"},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
    "MPI Final": [
        {"name": "pcs_received", "label": "No of Pcs", "type": "number"},
        {"name": "total_ok_pcs", "label": "OK Pcs", "type": "number"},
        {"name": "mpi_reject", "label": "Reject Pcs", "type": "number"},
        {"name": "ok_wt_mt", "label": "OK Weight (MT)", "type": "number", "step": "0.001"},
        {"name": "rej_wt_mt", "label": "Rej Weight (MT)", "type": "number", "step": "0.001"},
        {"name": "result", "label": "Result", "type": "select", "options": ["OK", "Not OK", "Pending"]},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
    "Packing": [
        {"name": "no_of_bundles", "label": "No of Bundles", "type": "number"},
        {"name": "pcs_per_bundle", "label": "Pcs / Bundle", "type": "number"},
        {"name": "bundle_wt", "label": "Bundle Wt (kg)", "type": "number", "step": "0.01"},
        {"name": "total_net_wt", "label": "Total Net Wt (kg)", "type": "number", "step": "0.01"},
        {"name": "gross_wt", "label": "Gross Wt (kg)", "type": "number", "step": "0.01"},
        {"name": "colour_code", "label": "Colour Code", "type": "text"},
        {"name": "remarks", "label": "Remarks", "type": "text"},
    ],
}

def get_next_stage(current):
    try:
        idx = STANDARD_FLOW.index(current)
        if idx + 1 < len(STANDARD_FLOW):
            return STANDARD_FLOW[idx + 1]
        return "Dispatch"
    except ValueError:
        return current


@scan_bp.route("/api/scan/resolve", methods=["GET"])
def resolve_qr():
    batch_id = request.args.get("b")
    token = request.args.get("t")
    stage = request.args.get("s", "")
    if not batch_id or not token:
        return jsonify({"error": "Missing batch or token"}), 400
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("""SELECT id, batch_card_no, so_number, heat_no, grade_code,
                       size_mm, length_mm, no_of_pcs, weight_kg, customer,
                       current_stage, current_stage_index, status, qr_token
                       FROM batches WHERE id=%s""", (batch_id,))
        batch = row_to_dict(cur, cur.fetchone())
        if not batch:
            cur.close(); conn.close()
            return jsonify({"error": "Batch not found"}), 404
        if batch.get("qr_token") != token:
            cur.close(); conn.close()
            return jsonify({"error": "Invalid QR token"}), 403

        target_stage = stage if stage else (batch.get("current_stage") or "Peeling")
        cur.execute("""SELECT id, machine_code, machine_name
                       FROM machines WHERE stage_name=%s AND is_active=1
                       ORDER BY machine_code""", (target_stage,))
        machines = rows_to_list(cur)
        cur.close(); conn.close()

        return jsonify({
            "status": "ok",
            "batch": batch,
            "stage": target_stage,
            "next_stage": get_next_stage(target_stage),
            "machines": machines,
            "fields": STAGE_FIELDS.get(target_stage, []),
            "is_qc_stage": target_stage in QC_STAGES,
            "current_shift": get_shift(),
            "today_date": datetime.now().strftime("%Y-%m-%d")
        })
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@scan_bp.route("/api/scan/complete", methods=["POST"])
def complete_stage():
    data = request.get_json()
    batch_id = data.get("batch_id")
    stage = data.get("stage")
    if not batch_id or not stage:
        return jsonify({"error": "Missing batch_id or stage"}), 400

    now = datetime.now()
    shift = data.get("shift") or get_shift(now)
    form_data = data.get("form_data", {})

    import json as _json
    extra_data_json = _json.dumps(form_data, default=str)

    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("""SELECT current_stage, batch_card_no, heat_no,
                       grade_code, size_mm FROM batches WHERE id=%s""", (batch_id,))
        batch = row_to_dict(cur, cur.fetchone())
        if not batch:
            cur.close(); conn.close()
            return jsonify({"error": "Batch not found"}), 404

        input_size = form_data.get("input_size") or form_data.get("input_length")
        output_size = form_data.get("output_size") or form_data.get("finish_length")
        ovality = form_data.get("ovality")
        remarks_combined = form_data.get("remarks", "") + " | " + extra_data_json

        # 1. Always write to stage_logs
        cur.execute("""INSERT INTO stage_logs
                       (batch_id, stage, operator, machine, shift,
                        input_size, output_size, ovality, remarks,
                        started_at, completed_at, logged_at)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", (
            batch_id, stage,
            data.get("operator", ""),
            data.get("machine", ""),
            shift,
            input_size, output_size, ovality,
            remarks_combined,
            now, now, now
        ))
        log_id = cur.lastrowid

        # 2. QC stage handling → write to qc_records + batch_inspection
        qc_record_id = None
        qc_result = None
        if stage in QC_STAGES:
            qc_result = form_data.get("result", "Pending")
            check_type = QC_CHECK_TYPE_MAP.get(stage, stage)

            cur.execute("""INSERT INTO qc_records (
                batch_id, batch_card_no, heat_no, grade, size_mm,
                check_type, date, inspector,
                pcs_received, ut_ok, ut_reject, mpi_reject,
                total_ok_pcs, end_cut_wt, ok_wt_mt, rej_wt_mt,
                furnace_no, hardness, tensile, result, remarks
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", (
                batch_id,
                batch.get("batch_card_no"),
                batch.get("heat_no"),
                batch.get("grade_code"),
                batch.get("size_mm"),
                check_type,
                now.date(),
                data.get("operator", ""),
                form_data.get("pcs_received"),
                form_data.get("ut_ok"),
                form_data.get("ut_reject"),
                form_data.get("mpi_reject"),
                form_data.get("total_ok_pcs"),
                form_data.get("end_cut_wt"),
                form_data.get("ok_wt_mt"),
                form_data.get("rej_wt_mt"),
                form_data.get("furnace_no"),
                form_data.get("hardness"),
                form_data.get("tensile"),
                qc_result,
                form_data.get("remarks", "")
            ))
            qc_record_id = cur.lastrowid

            # For UT Inspection → also write to batch_inspection
            if stage == "Black Bar Inspection":
                cur.execute("""INSERT INTO batch_inspection
                    (batch_id, date, pcs_received, ut_ok, ut_reject, mpi_reject,
                     end_cut_wt, total_ok_pcs, ok_wt, rej_wt, remark,
                     operator_name, started_at, completed_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", (
                    batch_id, now.date(),
                    form_data.get("pcs_received"),
                    form_data.get("ut_ok"),
                    form_data.get("ut_reject"),
                    form_data.get("mpi_reject"),
                    form_data.get("end_cut_wt"),
                    form_data.get("total_ok_pcs"),
                    form_data.get("ok_wt_mt"),
                    form_data.get("rej_wt_mt"),
                    form_data.get("remarks", ""),
                    data.get("operator", ""),
                    now, now
                ))

            # If QC failed → create alert
            if qc_result == "Not OK":
                try:
                    cur.execute("""INSERT INTO alerts
                        (alert_type, severity, message, batch_card_no, created_at)
                        VALUES (%s, %s, %s, %s, %s)""", (
                        "QC_FAIL",
                        "HIGH",
                        f"QC FAIL: {check_type} on Batch {batch['batch_card_no']} by {data.get('operator', 'Unknown')}",
                        batch["batch_card_no"],
                        now
                    ))
                except Exception as alert_err:
                    print(f"[ALERT WARN] Could not write alert: {alert_err}")

        # 3. Advance batch (unless QC failed)
        should_advance = True
        if stage in QC_STAGES and qc_result == "Not OK":
            should_advance = False

        next_stage = get_next_stage(stage)
        if should_advance and next_stage and next_stage != stage:
            new_status = 'Dispatched' if stage == 'Packing' else 'In Progress'
            cur.execute("""UPDATE batches
                           SET current_stage=%s, current_stage_index=%s,
                           status=%s WHERE id=%s""", (
                next_stage,
                STANDARD_FLOW.index(next_stage) if next_stage in STANDARD_FLOW else 0,
                new_status,
                batch_id
            ))
            cur.execute("""INSERT INTO batch_stage_history
                           (batch_card_no, from_stage, to_stage, moved_by, moved_at)
                           VALUES (%s,%s,%s,%s,%s)""", (
                batch["batch_card_no"], stage, next_stage,
                data.get("operator", "SCAN"), now
            ))
        elif not should_advance:
            cur.execute("""UPDATE batches SET status='Quality Hold' WHERE id=%s""", (batch_id,))

        conn.commit()
        cur.close(); conn.close()

        message = f"{stage} saved"
        if qc_record_id:
            message = f"QC recorded: {qc_result}"
        if stage in QC_STAGES and qc_result == "Not OK":
            message = "QC FAILED - Batch on Quality Hold"

        return jsonify({
            "status": "ok",
            "message": message,
            "log_id": log_id,
            "qc_record_id": qc_record_id,
            "qc_result": qc_result,
            "next_stage": next_stage if should_advance else stage,
            "advanced": should_advance,
            "timestamp": now.isoformat()
        })
    except Exception as e:
        import traceback
        try: conn.rollback()
        except: pass
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@scan_bp.route("/scan", methods=["GET"])
def scan_form():
    batch_id = request.args.get("b", "")
    token = request.args.get("t", "")
    stage = request.args.get("s", "")
    html = SCAN_HTML.replace("{{BATCH_ID}}", batch_id).replace("{{TOKEN}}", token).replace("{{STAGE}}", stage)
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}


SCAN_HTML = """<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Alok PMS Scan</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,Arial,sans-serif;background:#f5f5f5;padding:12px;}
.hdr{background:linear-gradient(135deg,#1F4E79,#2E75B6);color:white;padding:16px;border-radius:10px;margin-bottom:12px;}
.hdr h1{font-size:22px;}
.card{background:white;padding:16px;border-radius:10px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);}
.batch-no{font-size:28px;color:#E8642A;font-weight:bold;}
.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:14px;}
.row:last-child{border:none;}
.row .k{color:#666;} .row .v{font-weight:600;}
.stage{display:inline-block;background:#E8642A;color:white;padding:10px 20px;border-radius:20px;font-weight:bold;margin:10px 0;font-size:18px;}
.stage.qc{background:#8B1A1A;}
.next{background:#dce8f5;color:#185FA5;padding:6px 10px;border-radius:6px;font-size:13px;}
.qc-badge{display:inline-block;background:#fff4e6;color:#854F0B;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:bold;margin-left:5px;}
.fld{margin-bottom:12px;}
.fld label{display:block;font-size:13px;color:#555;margin-bottom:4px;font-weight:600;}
.fld input,.fld select{width:100%;padding:12px;font-size:16px;border:2px solid #ddd;border-radius:6px;}
.fld input:focus,.fld select:focus{border-color:#2E75B6;outline:none;}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.btn{width:100%;padding:18px;font-size:18px;font-weight:bold;background:#2ecc71;color:white;border:none;border-radius:8px;margin-top:10px;}
.btn.qc{background:#8B1A1A;}
.btn:active{background:#27ae60;}
.msg{padding:12px;border-radius:6px;margin-top:10px;font-size:14px;}
.ok{background:#d4edda;color:#155724;}
.err{background:#f8d7da;color:#721c24;}
.warn{background:#fff3cd;color:#856404;}
.load{text-align:center;padding:40px;color:#666;}
</style>
</head><body>

<div class="hdr"><h1>ALOK PMS</h1><div style="font-size:13px;opacity:0.9;">Production Scan</div></div>
<div id="app"><div class="load">Loading...</div></div>

<script>
const BID="{{BATCH_ID}}", TOK="{{TOKEN}}", STG="{{STAGE}}", API=window.location.origin;
let D=null;

async function load(){
  try{
    const r=await fetch(`${API}/api/scan/resolve?b=${BID}&t=${TOK}&s=${encodeURIComponent(STG)}`);
    const d=await r.json();
    if(d.error){document.getElementById('app').innerHTML=`<div class="msg err">${d.error}</div>`;return;}
    D=d; render();
  }catch(e){document.getElementById('app').innerHTML=`<div class="msg err">${e.message}</div>`;}
}

function render(){
  const b=D.batch, m=D.machines||[], s=D.stage, fields=D.fields||[], isQC=D.is_qc_stage;
  let machineOpts='<option value="">-- Select Machine --</option>';
  if(m.length===0) machineOpts='<option value="MANUAL">Manual / No machine</option>';
  else m.forEach(x=>machineOpts+=`<option value="${x.machine_code}">${x.machine_name}</option>`);

  let fieldHtml='';
  fields.forEach((f,i)=>{
    if(i%2===0) fieldHtml+='<div class="two">';
    if(f.type==='select'){
      let opts=f.options.map(o=>`<option value="${o}">${o}</option>`).join('');
      fieldHtml+=`<div class="fld"><label>${f.label}</label><select id="f_${f.name}">${opts}</select></div>`;
    } else {
      const step=f.step?`step="${f.step}"`:'';
      const inputmode=f.type==='number'?'inputmode="decimal"':'';
      fieldHtml+=`<div class="fld"><label>${f.label}</label><input type="${f.type}" ${step} ${inputmode} id="f_${f.name}"></div>`;
    }
    if(i%2===1 || i===fields.length-1) fieldHtml+='</div>';
  });

  const stageBadge=isQC?`<div class="stage qc">QC: ${s}</div><div class="qc-badge">QUALITY CHECK</div>`:`<div class="stage">${s}</div>`;
  const opLabel=isQC?'Inspector Name':'Operator Name / Sign';
  const btnLabel=isQC?`SUBMIT QC CHECK`:`SAVE ${s.toUpperCase()}`;
  const btnClass=isQC?'btn qc':'btn';

  document.getElementById('app').innerHTML=`
    <div class="card">
      <div class="batch-no">Batch ${b.batch_card_no}</div>
      <div class="row"><span class="k">Customer</span><span class="v">${b.customer||'-'}</span></div>
      <div class="row"><span class="k">Grade</span><span class="v">${b.grade_code||'-'}</span></div>
      <div class="row"><span class="k">Heat No</span><span class="v">${b.heat_no||'-'}</span></div>
      <div class="row"><span class="k">Size</span><span class="v">${b.size_mm||'-'} mm</span></div>
      <div class="row"><span class="k">Weight</span><span class="v">${b.weight_kg||'-'} kg</span></div>
      <div style="text-align:center;margin-top:10px;">
        ${stageBadge}
        <div class="next">After this: ${D.next_stage}</div>
      </div>
    </div>
    <div class="card">
      <h3 style="color:#1F4E79;margin-bottom:12px;">${isQC?'Fill QC Check Data':'Fill '+s+' Data'}</h3>
      <div class="two">
        <div class="fld"><label>Date</label><input type="date" id="f_date" value="${D.today_date}"></div>
        <div class="fld"><label>Shift</label><select id="f_shift"><option value="A" ${D.current_shift==='A'?'selected':''}>A (06-14)</option><option value="B" ${D.current_shift==='B'?'selected':''}>B (14-22)</option><option value="C" ${D.current_shift==='C'?'selected':''}>C (22-06)</option></select></div>
      </div>
      <div class="fld"><label>Machine</label><select id="machine">${machineOpts}</select></div>
      ${fieldHtml}
      <div class="fld"><label>${opLabel}</label><input id="operator" placeholder="Your name"></div>
      <button class="${btnClass}" onclick="submitScan()">${btnLabel}</button>
      <div id="msg"></div>
    </div>
  `;
}

async function submitScan(){
  const op=document.getElementById('operator').value.trim();
  if(!op){show('err','Please enter name');return;}

  const form_data={};
  D.fields.forEach(f=>{
    const el=document.getElementById('f_'+f.name);
    if(!el) return;
    if(f.type==='number'){
      const v=parseFloat(el.value);
      form_data[f.name]=isNaN(v)?null:v;
    } else {
      form_data[f.name]=el.value||null;
    }
  });
  form_data.date=document.getElementById('f_date').value;

  const payload={
    batch_id:parseInt(BID),stage:D.stage,
    machine:document.getElementById('machine').value,
    operator:op,
    shift:document.getElementById('f_shift').value,
    form_data:form_data
  };

  try{
    show('ok','Saving...');
    const r=await fetch(`${API}/api/scan/complete`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    const d=await r.json();
    if(d.error){show('err',d.error);return;}
    if(d.qc_result==='Not OK'){
      show('warn','QC FAILED - Batch on Quality Hold. Manager will be alerted.');
    } else if(d.advanced){
      show('ok',`Saved. Batch now at: ${d.next_stage}`);
    } else {
      show('ok',d.message);
    }
    setTimeout(()=>{window.location.reload();},2500);
  }catch(e){show('err',e.message);}
}

function show(t,h){document.getElementById('msg').innerHTML=`<div class="msg ${t}">${h}</div>`;}
load();
</script>
</body></html>"""