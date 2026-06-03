/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function readEnv(path) {
  const env = {};
  const text = fs.readFileSync(path, "utf8");

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

async function must(label, promise) {
  const result = await promise;
  if (result.error) {
    console.error(label, result.error);
    throw new Error(label);
  }
  return result;
}

async function main() {
  const env = readEnv(".env.local");
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const users = [
    {
      username: "admin",
      password: "admin123",
      display_name: "MOA 管理員",
      bio: "審核交換貼文、處理檢舉與維護社群安全。",
      avatar_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
      is_admin: true,
    },
    {
      username: "yeonbin",
      password: "txt123",
      display_name: "연빈收藏室",
      bio: "主收 TXT CD、藍色系小卡，可台北面交。",
      avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80",
      is_admin: false,
    },
    {
      username: "sora",
      password: "txt123",
      display_name: "Sora MOA",
      bio: "喜歡韓系手帳與演唱會小物交換。",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
      is_admin: false,
    },
  ];

  const { data: listedUsers } = await must("list users", client.auth.admin.listUsers({ page: 1, perPage: 1000 }));
  const ids = {};

  for (const user of users) {
    const email = `${user.username}@moa.local`;
    let authUser = listedUsers.users.find((item) => item.email === email);

    if (!authUser) {
      const { data } = await must(
        `create user ${email}`,
        client.auth.admin.createUser({
          email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            username: user.username,
            display_name: user.display_name,
          },
        }),
      );
      authUser = data.user;
    }

    ids[user.username] = authUser.id;
    await must(
      `upsert profile ${user.username}`,
      client.from("profiles").upsert({
        id: authUser.id,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        is_admin: user.is_admin,
      }),
    );
  }

  const { count } = await must("count posts", client.from("posts").select("id", { count: "exact", head: true }));
  if (count === 0) {
    const { data } = await must(
      "insert posts",
      client
        .from("posts")
        .insert([
          {
            user_id: ids.yeonbin,
            title: "The Name Chapter CD 換 Beomgyu 小卡",
            content: "CD 保存良好，含歌詞本。想換 Beomgyu 或 Soobin 概念小卡，台北捷運可面交。",
            category: "CD",
            status: "欲交換",
            tags: ["TXT", "CD", "Beomgyu", "台北面交"],
            image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
          },
          {
            user_id: ids.sora,
            title: "演唱會手幅與壓克力吊飾",
            content: "想交換同系列 Huening Kai 小物，也歡迎分享收藏照。不販售，純交換。",
            category: "小物",
            status: "徵求",
            tags: ["手幅", "吊飾", "HueningKai", "純交換"],
            image_url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
          },
          {
            user_id: ids.admin,
            title: "交換守則：請保留聊天紀錄與出貨照片",
            content: "平台不提供金流，只作為 TXT 周邊交換分享。請勿公開個資，遇到可疑內容請檢舉。",
            category: "照片小卡",
            status: "已交換",
            tags: ["公告", "安全交換", "MOA"],
            image_url: "https://images.unsplash.com/photo-1517142089942-ba376ce32a2e?auto=format&fit=crop&w=900&q=80",
          },
        ])
        .select("id"),
    );
    console.log(`Seeded ${data.length} posts`);
  } else {
    console.log(`Skipped posts seed; ${count} posts already exist`);
  }

  console.log("Supabase demo users ready");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
