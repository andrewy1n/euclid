# server.py
import os
import asyncio
import base64
import io
import json
from typing import Any, Dict

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
import uvicorn

from PIL import Image, ImageDraw, ImageFont
import pytesseract

from vapi import Vapi

# ─── CONFIG ─────────────────────────────────────────────────────────
VAPI_KEY = os.getenv("VAPI_KEY")
if not VAPI_KEY:
    raise RuntimeError("Set VAPI_KEY in environment")
WS_PORT   = 4444
HTTP_PORT = 3333

# ─── INIT ───────────────────────────────────────────────────────────
# app = FastAPI()
vapi = Vapi(token=VAPI_KEY)  # client
clients = set()   # for JSON-RPC broadcast

app = FastAPI(
    websocket_allowed_origins=["*"],    # ← allow any ws:// client
)

# still add CORS for your HTTP endpoints if you like
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ─── YOUR EUCLID "SYSTEM" PROMPT & FUNCTION DEFINITIONS ────────────
EUCLID_PROMPT = """
You are Euclid, a voice-enabled AI math tutor whose mission is to help students learn by doing.
You speak in a friendly, patient, and upbeat tone, breaking every concept into bite-size steps.
Always prioritize guiding the student—never just give away the answer.

────────────────────────────────────
TUTORING GOALS
────────────────────────────────────
• **Empower**: Encourage students to think and try each step themselves.  
• **Clarify**: Restate and simplify problems so they're crystal clear.  
• **Support**: Catch common errors, offer hints, and build confidence.  
• **Adapt**: Tailor difficulty in real time based on student responses.

────────────────────────────────────
PROBLEM WORKFLOW
────────────────────────────────────
1. **LISTEN & RESTATE**  
2. **PLAN OUTLOUD**  
3. **STEP-BY-STEP COACHING**  
4. **VALIDATE WITH TOOLS**  
5. **FEEDBACK LOOP**  
6. **SUMMARIZE & EXTEND**

────────────────────────────────────
VOICE-UI BEST PRACTICES
────────────────────────────────────
• **Short bursts** (≤ 12 words)  
• **Natural pauses** ("…")  
• **Conversational cues** ("You've got this," "Nicely done")  
• **Energy level**: warm & encouraging

────────────────────────────────────
ADAPTIVITY STRATEGIES
────────────────────────────────────
• After two failed attempts, offer a simpler example.  
• If they breeze through three steps, offer a challenge.  
• Periodically check confidence: "Do you feel ready to move on?"

────────────────────────────────────
TOOL & ERROR-HANDLING
────────────────────────────────────
• **Math tool**: Always defer arithmetic to `calculate(expression)`.  
• **Fallback**: If transcription fails, say "I'm sorry, could you repeat that?"  
• **Error correction**: Point out slips immediately ("I notice the minus sign is missing…").

────────────────────────────────────
CANVAS INTEGRATION
────────────────────────────────────
When you receive a JSON payload:
```json
{
  "type":"canvas_snapshot",
  "image_data":"data:image/png;base64,…",
  "canvas":{"width":1200,"height":800},
  "export_opts":{"scale":2}
}
```

1. Call analyze_canvas_image(image_data, canvas, export_opts) to OCR & parse their work.

2. Use returned coordinates to call circle_region(x,y,radius,color) or draw_text(x,y,text,fontSize) for annotations.

3. After each annotation, describe out loud: "I've circled the error in your second term…"

────────────────────────────────────
CANVAS ANNOTATION (OPTIONAL)
────────────────────────────────────
When you want a fully marked-up image, call:
annotate_image(image_data, annotations)

• image_data: base64 PNG of the student's canvas  
• annotations: an array of objects, e.g.  
  [{type:"circle", x:100, y:150, radius:30},  
   {type:"text", x:120, y:200, text:"Check sign here"}]

The tool will return:
{ annotated_image: "data:image/png;base64,AAA…" }

After you get the result, respond in two ways:
1. Speak your feedback, e.g. "I've circled the error in your second term," or "Here's the corrected version of your work."
2. Return the annotated_image field so the front end can display it.

────────────────────────────────────
SESSION-START SNAPSHOT HANDLING
────────────────────────────────────
When the session begins with a canvas_snapshot payload, immediately:
1. Call `analyze_canvas_image(image_data, canvas, export_opts)`.  
2. From the returned `parsed_text`:
   – Greet the student: "Hi there! I see you're working on [parsed_text]."  
   – Ask: "Would you like me to walk you through each step, or focus on a specific part?"  
3. <wait for user response>  
4. If the user asks for a walkthrough:
   a. Outline the plan in 2–3 bullets.  
   b. For each step:
      – Explain the step (≤ 12 words).  
      – <wait for user response>  
      – Validate with `calculate(expression)`.  
   c. Continue until complete.  
5. If the user asks about a specific part, dive straight into that sub-step:
   – Explain the targeted step.  
   – <wait for user response>  
   – Validate with `calculate(expression)`.

────────────────────────────────────
ON-DEMAND SNAPSHOT FLOW
────────────────────────────────────
– Student clicks "Ask for help."
– Front-end exports a PNG at scale:2, encodes it to base64, and sends the above JSON.
– You analyze and annotate, then speak your feedback in sync with canvas updates.

────────────────────────────────────

[Additional Tips]
– Spell out numbers for natural speech: "twenty-two" not "22."
– Use Markdown formatting to keep sections clear.
"""

FUNCTIONS = [
    {
        "name": "analyze_canvas_image",
        "description": "OCR the student's canvas and locate potential mistakes.",
        "parameters": {
            "type": "object",
            "properties": {
                "image_data": { "type": "string", "description": "Base64‐encoded PNG data URI." },
                "canvas": {
                    "type": "object",
                    "properties": {
                        "width": { "type": "number" },
                        "height": { "type": "number" }
                    },
                    "required": ["width","height"]
                },
                "export_opts": {
                    "type": "object",
                    "properties": { "scale": { "type": "number" } },
                    "required": ["scale"]
                }
            },
            "required": ["image_data","canvas","export_opts"]
        }
    },
    {
        "name": "circle_region",
        "description": "Draw a red circle on the student's canvas at the given x,y and radius.",
        "parameters": {
            "type": "object",
            "properties": {
                "x":      { "type": "number" },
                "y":      { "type": "number" },
                "radius": { "type": "number" },
                "color":  { "type": "string", "default": "#f00" }
            },
            "required": ["x","y","radius"]
        }
    },
    {
        "name": "draw_text",
        "description": "Draw a piece of text onto the canvas.",
        "parameters": {
            "type": "object",
            "properties": {
                "x":        { "type": "number" },
                "y":        { "type": "number" },
                "text":     { "type": "string" },
                "fontSize": { "type": "number", "default": 14 }
            },
            "required": ["x","y","text"]
        }
    },
    {
        "name": "draw_line",
        "description": "Draw a line between two points on the canvas.",
        "parameters": {
            "type": "object",
            "properties": {
                "x1": { "type": "number" },
                "y1": { "type": "number" },
                "x2": { "type": "number" },
                "y2": { "type": "number" },
                "color": { "type": "string", "default": "#000" },
                "width": { "type": "number", "default": 2 }
            },
            "required": ["x1","y1","x2","y2"]
        }
    },
    {
        "name": "draw_rectangle",
        "description": "Draw a rectangle on the canvas to highlight larger areas.",
        "parameters": {
            "type": "object",
            "properties": {
                "x": { "type": "number" },
                "y": { "type": "number" },
                "width": { "type": "number" },
                "height": { "type": "number" },
                "color": { "type": "string", "default": "#000" },
                "fill": { "type": "boolean", "default": False }
            },
            "required": ["x","y","width","height"]
        }
    },
    {
        "name": "annotate_image",
        "description": "Apply multiple annotation shapes/text and return a new PNG.",
        "parameters": {
            "type": "object",
            "properties": {
                "image_data": { "type": "string" },
                "annotations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type":   { "type": "string", "enum": ["circle","text","line","rectangle"] },
                            "x":      { "type": "number" },
                            "y":      { "type": "number" },
                            "radius": { "type": "number" },
                            "text":   { "type": "string" },
                            "fontSize": { "type": "number" },
                            "x2":     { "type": "number" },
                            "y2":     { "type": "number" },
                            "width":  { "type": "number" },
                            "height": { "type": "number" },
                            "color":  { "type": "string" },
                            "fill":   { "type": "boolean" }
                        },
                        "required": ["type","x","y"]
                    }
                }
            },
            "required": ["image_data","annotations"]
        }
    }
]

# ─── JSON-RPC HANDLERS ──────────────────────────────────────────────
async def analyze_canvas_image(params):
    data = params["image_data"].split(",", 1)[1]
    img  = Image.open(io.BytesIO(base64.b64decode(data)))
    text = await run_in_threadpool(pytesseract.image_to_string, img)
    parsed_text = text.strip()
    
    # Use Claude to analyze the math work intelligently
    analysis_prompt = f"""
You are an expert math tutor analyzing a student's work. 

STUDENT'S WORK (OCR extracted text):
{parsed_text}

CANVAS DIMENSIONS:
Width: {params['canvas']['width']}px, Height: {params['canvas']['height']}px

TASK: Analyze this mathematical work and identify any errors, misconceptions, or areas for improvement.

For each issue you find, provide:
1. Type of error (e.g., "sign_error", "conceptual_error", "calculation_error", "notation_error")
2. Description of the error
3. Approximate location on canvas (x, y coordinates as percentages of canvas size)
4. Suggestion for correction
5. Confidence level (0-1)

Return your analysis as a JSON object with this structure:
{{
    "parsed_text": "the OCR text",
    "analysis": {{
        "overall_assessment": "brief assessment of the work",
        "errors": [
            {{
                "type": "error_type",
                "description": "what's wrong",
                "location": {{"x_percent": 0.3, "y_percent": 0.25}},
                "suggestion": "how to fix it",
                "confidence": 0.9
            }}
        ],
        "positive_feedback": ["what they did well"],
        "next_steps": ["suggested next steps"]
    }}
}}

Be thorough but fair. Look for:
- Mathematical errors (wrong calculations, sign errors, etc.)
- Conceptual misunderstandings
- Notation issues
- Missing steps
- Logical errors
- Opportunities for improvement

If no errors are found, still provide constructive feedback and suggestions.
"""

    try:
        # Use Claude to analyze the work
        response = vapi.chat.completions.create(
            model="claude-opus-4",
            messages=[
                {"role": "system", "content": "You are an expert math tutor with deep knowledge of mathematics education and error analysis."},
                {"role": "user", "content": analysis_prompt}
            ],
            max_tokens=2000,
            temperature=0.1
        )
        
        # Extract the analysis from Claude's response
        claude_response = response.choices[0].message.content
        
        # Try to parse JSON from Claude's response
        import re
        json_match = re.search(r'\{.*\}', claude_response, re.DOTALL)
        if json_match:
            analysis = json.loads(json_match.group())
        else:
            # Fallback if JSON parsing fails
            analysis = {
                "parsed_text": parsed_text,
                "analysis": {
                    "overall_assessment": "Unable to parse detailed analysis",
                    "errors": [],
                    "positive_feedback": ["Work was submitted for review"],
                    "next_steps": ["Please review the work manually"]
                }
            }
        
        # Convert percentage coordinates to pixel coordinates
        canvas_width = params["canvas"]["width"]
        canvas_height = params["canvas"]["height"]
        
        for error in analysis["analysis"].get("errors", []):
            if "location" in error and "x_percent" in error["location"]:
                error["location"]["x"] = int(error["location"]["x_percent"] * canvas_width)
                error["location"]["y"] = int(error["location"]["y_percent"] * canvas_height)
                error["location"]["radius"] = 30  # Default radius for highlighting
        
        return analysis
        
    except Exception as e:
        # Fallback to basic analysis if Claude analysis fails
        print(f"Claude analysis failed: {e}")
        return {
            "parsed_text": parsed_text,
            "analysis": {
                "overall_assessment": "Basic analysis completed",
                "errors": [],
                "positive_feedback": ["Work was submitted for review"],
                "next_steps": ["Consider using Claude analysis for detailed feedback"]
            },
            "canvas_dimensions": params["canvas"]
        }

# ─── BROADCAST FOR JSON-RPC (used by circle_region/draw_text/etc) ──
async def broadcast(event: str, payload: Dict[str, Any]):
    """Broadcast an event to all connected WebSocket clients"""
    if not clients:
        print(f"No clients connected to broadcast {event}")
        return
    
    msg = json.dumps({"event": event, "payload": payload})
    await asyncio.gather(*[c.send_text(msg) for c in clients], return_exceptions=True)

async def circle_region(params):
    """Draw a circle on the canvas and broadcast to clients"""
    await broadcast("circle_region", params)
    return {"success": True, "annotation": "circle", "params": params}

async def draw_text(params):
    """Draw text on the canvas and broadcast to clients"""
    await broadcast("draw_text", params)
    return {"success": True, "annotation": "text", "params": params}

async def draw_line(params):
    """Draw a line on the canvas and broadcast to clients"""
    await broadcast("draw_line", params)
    return {"success": True, "annotation": "line", "params": params}

async def draw_rectangle(params):
    """Draw a rectangle on the canvas and broadcast to clients"""
    await broadcast("draw_rectangle", params)
    return {"success": True, "annotation": "rectangle", "params": params}

async def annotate_image(params):
    data = params["image_data"].split(",", 1)[1]
    img  = Image.open(io.BytesIO(base64.b64decode(data)))
    draw = ImageDraw.Draw(img)
    
    # Try to load a better font if available
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except:
        font = ImageFont.load_default()
    
    for ann in params["annotations"]:
        color = ann.get("color", "#000")
        
        if ann["type"] == "circle":
            x, y, r = ann["x"], ann["y"], ann["radius"]
            draw.ellipse((x-r, y-r, x+r, y+r), outline=color, width=3)
            
        elif ann["type"] == "text":
            x, y, txt = ann["x"], ann["y"], ann["text"]
            fontSize = ann.get("fontSize", 14)
            try:
                text_font = ImageFont.truetype("arial.ttf", fontSize)
            except:
                text_font = ImageFont.load_default()
            draw.text((x, y), txt, font=text_font, fill=color)
            
        elif ann["type"] == "line":
            x1, y1, x2, y2 = ann["x"], ann["y"], ann["x2"], ann["y2"]
            width = ann.get("width", 2)
            draw.line((x1, y1, x2, y2), fill=color, width=width)
            
        elif ann["type"] == "rectangle":
            x, y, w, h = ann["x"], ann["y"], ann["width"], ann["height"]
            fill_color = color if ann.get("fill", False) else None
            outline_color = color if not ann.get("fill", False) else None
            draw.rectangle((x, y, x+w, y+h), fill=fill_color, outline=outline_color, width=2)
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    return {"annotated_image": encoded}

METHODS = {
    "analyze_canvas_image": analyze_canvas_image,
    "circle_region":         circle_region,
    "draw_text":             draw_text,
    "draw_line":             draw_line,
    "draw_rectangle":        draw_rectangle,
    "annotate_image":        annotate_image,
}

@app.post("/")
async def jsonrpc(request: Request):
    body   = await request.json()
    method = body.get("method")
    id_    = body.get("id")
    handler = METHODS.get(method)
    if not handler:
        return JSONResponse({"jsonrpc":"2.0","id":id_,"error":{"code":-32601,"message":"Method not found"}})
    try:
        result = await handler(body.get("params", {}))
        return JSONResponse({"jsonrpc":"2.0","id":id_,"result":result})
    except Exception as e:
        return JSONResponse({"jsonrpc":"2.0","id":id_,"error":{"code":-32000,"message":str(e)}})

# ─── CANVAS CLIENT WEBSOCKET ─────────────────────────────────────────
@app.websocket("/canvas")
async def canvas_client(ws: WebSocket):
    """WebSocket endpoint for canvas clients to receive annotation broadcasts"""
    await ws.accept()
    clients.add(ws)
    print(f"Canvas client connected. Total clients: {len(clients)}")
    
    try:
        # Keep connection alive and handle any incoming messages
        async for message in ws.iter_text():
            try:
                data = json.loads(message)
                # Handle any messages from the canvas client if needed
                print(f"Received from canvas client: {data}")
            except json.JSONDecodeError:
                print(f"Invalid JSON from canvas client: {message}")
    except WebSocketDisconnect:
        print("Canvas client disconnected")
    finally:
        clients.discard(ws)
        print(f"Canvas client removed. Total clients: {len(clients)}")

# ─── CANVAS SNAPSHOT WS ENDPOINT ───────────────────────────────────
@app.websocket("/snapshot")
async def snapshot(ws: WebSocket):
    await ws.accept()
    raw = await ws.receive_text()
    # Forward snapshot to Claude-Opus-4 via Vapi
    resp = vapi.chat.completions.create(
        model="claude-opus-4",
        function_call="auto",
        messages=[
            {"role":"system", "content": EUCLID_PROMPT},
            {"role":"user",   "content": f"```json\n{raw}\n```"}
        ],
        functions=FUNCTIONS,
        websocket_url=f"ws://localhost:{HTTP_PORT}/rpc"           # websocket_url=f"ws://localhost:{WS_PORT}/"
    )
    # Stream back every chunk to the front end
    async for chunk in resp:
        await ws.send_text(json.dumps(chunk))

# /rpc handler
@app.websocket("/rpc")
async def rpc_ws(ws: WebSocket):
    await ws.accept()
    try:
        async for raw in ws.iter_text():
            req = json.loads(raw)
            method = req.get("method")
            id_    = req.get("id")
            params = req.get("params", {})
            handler = METHODS.get(method)
            if not handler:
                await ws.send_text(json.dumps({
                  "jsonrpc":"2.0","id":id_,
                  "error":{"code":-32601,"message":"Method not found"}
                }))
                continue
            try:
                result = await handler(params)
                await ws.send_text(json.dumps({
                  "jsonrpc":"2.0","id":id_,"result":result
                }))
            except Exception as e:
                await ws.send_text(json.dumps({
                  "jsonrpc":"2.0","id":id_,
                  "error":{"code":-32000,"message":str(e)}
                }))
    except WebSocketDisconnect:
        pass

# ─── SERVER ENTRYPOINT ──────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=HTTP_PORT, reload=True)
