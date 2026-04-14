export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_KEY) return res.status(500).json({ error: "Missing NOTION_API_KEY" });
  if (!DATABASE_ID) return res.status(500).json({ error: "Missing NOTION_DATABASE_ID" });

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: "Notion API error", status: response.status, detail: errText });
    }

    const data = await response.json();

    const rows = data.results.map(row => ({
      name: row.properties.Name?.title?.[0]?.plain_text ?? "NO NAME FOUND",
      streak: row.properties.Streak?.number ?? "NO STREAK FOUND"
    }));

    res.status(200).json({ rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
