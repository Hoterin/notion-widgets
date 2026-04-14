export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
 
  const NOTION_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;
 
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
 
    const data = await response.json();
 
    const rows = data.results.map(row => ({
      name: row.properties.Name?.title?.[0]?.plain_text ?? "NO NAME FOUND",
      streak: row.properties.Streak?.number ?? "NO STREAK FOUND"
    }));
 
    res.status(200).json({ rows });
 
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch" });
  }
}
