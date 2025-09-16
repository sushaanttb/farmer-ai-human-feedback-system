from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
from sqlalchemy import create_engine
from collections import Counter
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./data.db')
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith('sqlite') else {})

STOPWORDS = set([
    'the','and','to','a','of','in','is','for','it','on','that','this','with','as','are','you','we','be','or','by','an','have','i','not','but','if','from','at','your','our'
])
WORD_RE = re.compile(r"\w+", flags=re.UNICODE)

@app.get('/insights')
def get_insights():
    try:
        df = pd.read_sql_query('SELECT * FROM conversationmodel', engine)
    except Exception:
        # fallback try lowercase table name
        try:
            df = pd.read_sql_query('SELECT * FROM ConversationModel', engine)
        except Exception as e:
            return {"error": "Could not read conversation table", "detail": str(e)}

    # top bots
    top_bots = df['bot'].fillna('Unknown').value_counts().head(20).to_dict()

    # top subjects and crops
    top_subjects = df['subject'].fillna('Unknown').value_counts().head(20).to_dict() if 'subject' in df.columns else {}
    top_crops = df['crop'].fillna('Unknown').value_counts().head(20).to_dict() if 'crop' in df.columns else {}

    # feedback stats
    feedback_stats = df['feedback_neg'].fillna(0).value_counts().to_dict() if 'feedback_neg' in df.columns else {}

    # monthly counts
    if 'sent_date' in df.columns:
        # try parse
        df['__sent_dt'] = pd.to_datetime(df['sent_date'], errors='coerce')
        monthly = df.dropna(subset=['__sent_dt']).groupby(df['__sent_dt'].dt.to_period('M')).size()
        monthly_counts = {str(k): int(v) for k, v in monthly.items()}
    else:
        monthly_counts = {}

    # top words in user_message_en
    if 'user_message_en' in df.columns:
        texts = df['user_message_en'].dropna().astype(str).tolist()
        counter = Counter()
        for t in texts:
            for w in WORD_RE.findall(t.lower()):
                if len(w) < 2: continue
                if w in STOPWORDS: continue
                counter[w] += 1
        top_words = counter.most_common(50)
    else:
        top_words = []

    insights = {
        'top_bots': top_bots,
        'top_subjects': top_subjects,
        'top_crops': top_crops,
        'feedback_stats': feedback_stats,
        'monthly_counts': monthly_counts,
        'top_words': top_words,
        'total_conversations': int(len(df))
    }
    return insights

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=5175, reload=True)
