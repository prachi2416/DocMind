import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { conversation_id } = req.query;
      let query = supabase.from('messages').select('*');
      if (conversation_id) {
        query = query.eq('conversation_id', conversation_id);
      }
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { conversation_id, role, content, sources } = req.body;
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id,
          role,
          content,
          sources: sources || [],
        })
        .select()
        .single();
      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation_id);

      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Messages API error:', err);
    res.status(500).json({ error: err.message });
  }
}
