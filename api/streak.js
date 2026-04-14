export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;
  const HABIT_NAME = "Gym";

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

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const streak = data.results[0].properties.Streak.number;
    res.status(200).json({ streak });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch streak" });
  }
}
