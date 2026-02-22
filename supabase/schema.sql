-- Таблица за теми/дебати
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  custom_tag TEXT,
  content_type TEXT DEFAULT 'debate', -- 'debate', 'poll', 'vs'
  content_data JSONB DEFAULT NULL,
  sort_order INTEGER,
  published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица за аргументи
CREATE TABLE IF NOT EXISTS arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  side TEXT NOT NULL, -- 'pro' или 'con'
  author TEXT DEFAULT 'Анонимен',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица за коментари към аргументи
CREATE TABLE IF NOT EXISTS argument_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  argument_id UUID REFERENCES arguments(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'pro' или 'con'
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица за гласове (анкети и VS)
CREATE TABLE IF NOT EXISTS content_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  voter_key TEXT NOT NULL, -- за предотвратяване на повторно гласуване
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topic_id, voter_key)
);

-- Таблица за меню филтри
CREATE TABLE IF NOT EXISTS menu_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  filter_type TEXT NOT NULL, -- 'content_type' или 'tag'
  filter_value TEXT NOT NULL,
  sort_order INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица за админ потребители
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- Свързва се с auth.users
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - даваме достъп за четене на всички
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE argument_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select" ON topics FOR SELECT USING (true);
CREATE POLICY "Allow public select" ON arguments FOR SELECT USING (true);
CREATE POLICY "Allow public select" ON argument_comments FOR SELECT USING (true);
CREATE POLICY "Allow public select" ON menu_filters FOR SELECT USING (true);
CREATE POLICY "Allow public select" ON content_votes FOR SELECT USING (true);

-- Индекси за по-бърза работа
CREATE INDEX IF NOT EXISTS idx_topics_published ON topics(published);
CREATE INDEX IF NOT EXISTS idx_arguments_topic ON arguments(topic_id);
CREATE INDEX IF NOT EXISTS idx_comments_argument ON argument_comments(argument_id);