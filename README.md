# Skim

Skim is a personalized daily tech digest platform featuring a Next.js web dashboard and a Python-based background pipeline. It aggregates top tech news, summarizes it using AI, and delivers customized digests to users based on their preferences.

## System Architecture

The project consists of three main components:

1. **Database (`Supabase` / `PostgreSQL`)**: 
   - Stores user profiles, authentication data, and user preferences (themes, fonts, topics).
   - Stores aggregated articles, AI-generated summaries, and delivery logs.
   - Enforces data access rules through PostgreSQL Row Level Security (RLS).

2. **Dashboard (`/dashboard`)**: 
   - A modern Next.js web application built with React and Tailwind CSS.
   - Provides user authentication, onboarding, and profile management.
   - Allows users to customize their digest email preferences (format, theme, font style, summary style).
   - Features an Admin Control Center for superusers to manage signups and halt/resume digest deliveries.

3. **Pipeline (`/pipeline`)**: 
   - A Python-based background worker application.
   - Scrapes daily news from configured sources.
   - Uses Large Language Models (LLMs) to classify topics, gauge importance, and extract bullet points and insights.
   - Renders customized HTML emails using Jinja2 templates based on each user's unique preferences.
   - Dispatches the customized daily digests via email.

## Getting Started

### Prerequisites
- Node.js (v20+)
- Python (3.11+)
- A Supabase Project
- An LLM Provider API Key (e.g., Groq, Gemini)
- An Email Provider (e.g., Resend, Mailtrap)

### Environment Setup

1. **Dashboard Setup**:
   Navigate to `/dashboard` and copy the environment template:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase URL and Keys. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```

2. **Pipeline Setup**:
   Navigate to `/pipeline` and copy the environment template:
   ```bash
   cp .env.example .env
   ```
   Fill in your database URL and API keys. Set up the virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
   Run the pipeline:
   ```bash
   python main.py
   ```

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, TypeScript
- **Backend / Pipeline**: Python, Jinja2, psycopg2
- **Database**: PostgreSQL (hosted on Supabase)
- **AI / Processing**: Groq / Google Gemini APIs
