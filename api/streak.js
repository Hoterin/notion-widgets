export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;
  const HABIT_NAME = "Gym";

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
      body: JSON.stringify({
        filter: {
          property: "Name",
          title: { equals: HABIT_NAME }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: "Notion API error", status: response.status, detail: errText });
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const streak = data.results[0].properties["Streak (number only)"]?.formula?.number ?? 0;
    res.status(200).json({ streak });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
