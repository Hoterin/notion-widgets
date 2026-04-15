export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const GOOD_HABITS_ID = process.env.NOTION_GOOD_HABITS_ID;
  const HABIT_NAME = "Gym";

  if (!NOTION_KEY) return res.status(500).json({ error: "Missing NOTION_API_KEY" });
  if (!GOOD_HABITS_ID) return res.status(500).json({ error: "Missing NOTION_GOOD_HABITS_ID" });

  try {
    const gymId = await getGymId(NOTION_KEY, process.env.NOTION_DATABASE_ID);

    let allResults = [];
    let cursor = undefined;
    let hasMore = true;

    while (hasMore) {
      const body = {
        filter: {
          property: "Habits",
          relation: { contains: gymId }
        },
        sorts: [{ property: "Date", direction: "descending" }],
        page_size: 100
      };

      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${GOOD_HABITS_ID}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NOTION_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    const streak = calculateStreak(allResults);
    res.status(200).json({ streak });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getGymId(notionKey, streakDbId) {
  const response = await fetch(`https://api.notion.com/v1/databases/${streakDbId}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${notionKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filter: { property: "Name", title: { equals: "Gym" } },
      page_size: 1
    })
  });
  const data = await response.json();
  return data.results[0].id;
}

function calculateStreak(entries) {
  const doneDates = entries
    .filter(e => e.properties.Done?.checkbox === true)
    .map(e => {
      const raw = e.properties.Date?.date?.start;
      return raw ? raw.split("T")[0] : null;
    })
    .filter(Boolean);

  if (doneDates.length === 0) return 0;

  const unique = [...new Set(doneDates)].sort((a, b) => b.localeCompare(a));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let expected = new Date(today);

  const latestDate = new Date(unique[0]);
  if (latestDate.getTime() < today.getTime()) {
    expected = latestDate;
  }

  for (const dateStr of unique) {
    const date = new Date(dateStr);
    const diff = Math.round((expected - date) / (1000 * 60 * 60 * 24));
    if (diff === 0) {
      streak++;
      expected.setDate(expected.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
