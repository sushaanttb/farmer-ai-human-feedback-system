from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from typing import List, Dict, Any
import os
from sqlmodel import SQLModel, Field, Session, create_engine, select, delete
from sqlalchemy import text

app = FastAPI(title="Farmer AI Chatbot API")

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./data.db')
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

class ConversationModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    sent_date: str | None = None
    user_message_en: str | None = None
    assistant_message_en: str | None = None
    bot: str | None = None
    subject: str | None = None
    crop: str | None = None
    feedback_neg: int | None = None
    hashedid: str | None = None
    expert_answer: str | None = None
    status: str | None = Field(default='Open')

class ExpertAnswerModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    conversation_id: int
    expert_answer: str

# create DB
SQLModel.metadata.create_all(engine)

# Ensure new columns exist when the DB was created with an older schema
def ensure_conversation_columns():
    try:
        with engine.begin() as conn:
            rows = conn.execute(text("PRAGMA table_info('conversationmodel')")).fetchall()
            existing = [r[1] for r in rows]
            if 'expert_answer' not in existing:
                conn.execute(text("ALTER TABLE conversationmodel ADD COLUMN expert_answer TEXT"))
            if 'status' not in existing:
                # default to 'Open' for existing rows
                conn.execute(text("ALTER TABLE conversationmodel ADD COLUMN status TEXT DEFAULT 'Open'"))
    except Exception:
        # If anything fails here, we continue — errors will surface later during requests
        pass

ensure_conversation_columns()

# CORS origins from env or defaults
allow_origins_env = os.environ.get('ALLOW_ORIGINS')
if allow_origins_env:
    allow_origins = [o.strip() for o in allow_origins_env.split(',') if o.strip()]
else:
    allow_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# replace DATA_STORE usage with DB operations

class Conversation(BaseModel):
    index: int
    bot: str | None = None
    language: str | None = None
    subject: str | None = None
    crop: str | None = None
    sent_date: str | None = None
    user_message_en: str | None = None
    assistant_message_en: str | None = None
    feedback_neg: int | None = None
    hashedid: str | None = None

class AnswerPayload(BaseModel):
    index: int
    expert_answer: str

@app.post('/upload')
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        if file.filename.lower().endswith('.csv'):
            from io import StringIO
            s = StringIO(contents.decode('utf-8'))
            df = pd.read_csv(s)
        else:
            from io import BytesIO
            df = pd.read_excel(BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

    if 'Feedback Neg' not in df.columns:
        raise HTTPException(status_code=400, detail="Uploaded file must contain 'Feedback Neg' column")

    neg_df = df[df['Feedback Neg'] == 1]

    # persist conversations
    with Session(engine) as session:
        # clear existing conversations for demo simplicity
        session.exec(select(ConversationModel)).all()
        # use SQLModel delete() instead of raw SQL text
        session.exec(delete(ConversationModel))
        session.commit()

        for i, row in neg_df.iterrows():
            conv = ConversationModel(
                id=int(i),
                sent_date=str(row.get('Sent Date')) if 'Sent Date' in row else None,
                user_message_en=row.get('User Message (EN)') if 'User Message (EN)' in row else None,
                assistant_message_en=row.get('Assistant Message (EN)') if 'Assistant Message (EN)' in row else None,
                bot=row.get('Bot') if 'Bot' in row else None,
                subject=row.get('Subject') if 'Subject' in row else None,
                crop=row.get('Crop') if 'Crop' in row else None,
                feedback_neg=int(row.get('Feedback Neg')) if 'Feedback Neg' in row else None,
                hashedid=str(row.get('HashedID')) if 'HashedID' in row else None,
                expert_answer=None,
                status='Open',
            )
            session.add(conv)
        session.commit()

    return {"count": len(neg_df)}

@app.get('/conversations')
async def get_conversations():
    with Session(engine) as session:
        results = session.exec(select(ConversationModel)).all()
        rows = []
        for r in results:
            d = r.dict()
            # expose index for frontend convenience and include expert_answer/status
            d['index'] = r.id
            d['expert_answer'] = r.expert_answer
            d['status'] = r.status
            rows.append(d)
    return {'count': len(rows), 'rows': rows}

@app.post('/answer')
async def post_answer(payload: AnswerPayload):
    with Session(engine) as session:
        # check conversation exists
        conv = session.get(ConversationModel, payload.index)
        if not conv:
            raise HTTPException(status_code=404, detail='Conversation not found')
        # if an expert answer already exists for this conversation, update it
        existing = session.exec(select(ExpertAnswerModel).where(ExpertAnswerModel.conversation_id == payload.index)).first()
        if existing:
            existing.expert_answer = payload.expert_answer
            session.add(existing)
            ans = existing
        else:
            ans = ExpertAnswerModel(conversation_id=payload.index, expert_answer=payload.expert_answer)
            session.add(ans)
        # update conversation status and store expert_answer for quick access
        conv.status = 'Closed'
        conv.expert_answer = payload.expert_answer
        session.add(conv)
        session.commit()
        session.refresh(ans)
    return {'status': 'ok', 'id': ans.id}


@app.post('/admin/reset')
async def admin_reset():
    # developer convenience: clear all conversations and answers
    with Session(engine) as session:
        session.exec(delete(ExpertAnswerModel))
        session.exec(delete(ConversationModel))
        session.commit()
    return {'status': 'ok'}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8000)
