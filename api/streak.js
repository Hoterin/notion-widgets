export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const GOOD_HABITS_ID = process.env.NOTION_GOOD_HABITS_ID;
  const STREAK_DB_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_KEY) return res.status(500).json({ error: "Missing NOTION_API_KEY" });
  if (!GOOD_HABITS_ID) return res.status(500).json({ error: "Missing NOTION_GOOD_HABITS_ID" });

  try {
    const gymId = await getGymId(NOTION_KEY, STREAK_DB_ID);

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

    const result = calculateStreak(allResults);
    res.status(200).json(result);

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

function toDateStr(date) {
  return date.toISOString().split("T")[0];
}

function isRestDay(dateStr) {
  const day = new Date(dateStr + "T12:00:00").getDay();
  // 0 = Sunday, 4 = Thursday, 6 = Saturday
  return day === 0 || day === 4 || day === 6;
}

function calculateStreak(entries) {
  // Build a map of date -> { created: bool, done: bool }
  const entryMap = {};
  for (const e of entries) {
    const raw = e.properties.Date?.date?.start;
    if (!raw) continue;
    const dateStr = raw.split("T")[0];
    entryMap[dateStr] = {
      created: true,
      done: e.properties.Done?.checkbox === true
    };
  }

  // Determine today's status
  const todayBR = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const todayStr = toDateStr(todayBR);
  const todayEntry = entryMap[todayStr];

  // todayStatus: "done" | "pending" | "failed" | "rest"
  let todayStatus;
  if (isRestDay(todayStr)) {
    if (!todayEntry) {
      todayStatus = "rest"; // rest day, no entry = normal rest
    } else if (todayEntry.done) {
      todayStatus = "done"; // trained on rest day
    } else {
      todayStatus = "pending"; // created but not yet checked on rest day
    }
  } else {
    if (!todayEntry) {
      todayStatus = "pending"; // tasks not created yet today
    } else if (todayEntry.done) {
      todayStatus = "done";
    } else {
      todayStatus = "pending"; // created but not yet checked
    }
  }

  // Calculate streak going backwards from yesterday
  // (today is handled separately via todayStatus)
  let streak = 0;
  const startDate = new Date(todayBR);
  startDate.setDate(startDate.getDate() - 1); // start from yesterday

  for (let i = 0; i < 365; i++) {
    const dateStr = toDateStr(startDate);
    const entry = entryMap[dateStr];
    const restDay = isRestDay(dateStr);

    if (restDay && !entry) {
      // Rest day with no entry — skip, continue streak
      startDate.setDate(startDate.getDate() - 1);
      continue;
    }

    if (entry && entry.done) {
      streak++;
      startDate.setDate(startDate.getDate() - 1);
      continue;
    }

    // entry exists but not done, or required day with no entry = streak broken
    break;
  }

  // Add today to streak if done
  if (todayStatus === "done") streak++;

  // If today's streak is broken (non-rest day ended without check), reset
  // This is handled client-side at midnight via todayStatus

  return {
    streak,
    todayStatus // "done" | "pending" | "rest"
  };
}
