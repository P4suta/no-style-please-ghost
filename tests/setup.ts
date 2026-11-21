import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type APIResponse, type FullConfig, request } from "@playwright/test";
import { archiveFile, pageSize, site, theme } from "./publication";

async function check(response: APIResponse) {
  if (!response.ok()) {
    throw new Error(`${response.status()} ${response.url()}: ${await response.text()}`);
  }
  return response;
}

export default async function setup(config: FullConfig) {
  const admin = await request.newContext({
    baseURL: `${site}ghost/api/admin/`,
    extraHTTPHeaders: { Origin: new URL(site).origin, "Accept-Version": "v6.0" },
  });
  try {
    const email = "editor@example.test";
    const password = randomBytes(24).toString("base64url");
    await check(
      await admin.post("authentication/setup/", {
        data: { setup: [{ email, password, name: "River Avery", blogTitle: "Field Notes" }] },
      }),
    );
    await check(await admin.post("session/", { data: { username: email, password } }));
    await check(await admin.post("themes/upload/", { multipart: { file: archiveFile() } }));
    await check(await admin.put(`themes/${theme}/activate/`));

    const settings = (key: string, value: string | null) =>
      admin.put("settings/", { data: { settings: [{ key, value }] } }).then(check);
    await settings("navigation", JSON.stringify([{ label: "About", url: `${site}about/` }]));
    await settings(
      "secondary_navigation",
      JSON.stringify([{ label: "Colophon", url: `${site}about/` }]),
    );
    for (const collection of ["posts", "pages"]) {
      const response = await check(await admin.get(`${collection}/?limit=all&fields=id`));
      const initial = await response.json();
      for (const item of initial[collection]) {
        await check(await admin.delete(`${collection}/${item.id}/`));
      }
    }

    const output = config.projects[0].outputDir;
    await mkdir(output, { recursive: true });
    async function capture(name: string, path = "./") {
      const response = await check(await admin.get(new URL(path, site).href));
      await writeFile(join(output, `${name}.html`), await response.text());
    }
    await capture("empty");
    await settings("members_signup_access", "invite");
    await capture("invite");
    await settings("members_signup_access", "none");
    await capture("closed");
    await settings("members_signup_access", "all");

    const upload = await check(
      await admin.post("images/upload/", {
        multipart: {
          file: {
            name: "window.png",
            mimeType: "image/png",
            buffer: Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAABLAAAAMgAQAAAAAbm6avAAAAjElEQVR42u3BMQEAAADCoPVPbQdvoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4D1+8AARpxgZ8AAAAASUVORK5CYII=",
              "base64",
            ),
          },
        },
      }),
    );
    const photo = (await upload.json()).images[0].url;
    await settings("logo", photo);
    await settings("icon", photo);
    await capture("publication-icon");
    await settings("icon", null);

    async function publish(endpoint: string, fields: Record<string, unknown>) {
      await check(
        await admin.post(`${endpoint}/${fields.html ? "?source=html" : ""}`, {
          data: { [endpoint]: [{ status: "published", ...fields }] },
        }),
      );
    }
    const articleBody =
      '<p>Light reached the library.</p><p><a href="#details">Read the notes</a></p><h2 id="details">Details</h2><pre><code>' +
      "long-code-line".repeat(30) +
      "</code></pre>";
    const lexical = (children: Record<string, unknown>[]) =>
      JSON.stringify({
        root: { type: "root", version: 1, direction: null, format: "", indent: 0, children },
      });
    const tierResponse = await check(await admin.get("tiers/?filter=type:paid&limit=1"));
    const [tier] = (await tierResponse.json()).tiers;
    if (!tier) throw new Error("The test publication needs its default paid tier");
    process.env.GHOST_TEST_TIER = tier.name;
    await publish("posts", {
      title: "Bindery ledger",
      slug: "bindery-ledger",
      visibility: "tiers",
      tiers: [{ id: tier.id }],
      tags: ["Patrons"],
      published_at: "2022-01-01T12:00:00Z",
      html: "<p>The binding inventory for this tier.</p>",
    });
    await publish("posts", {
      title: "Patrons’ notebook",
      slug: "patrons-notebook",
      visibility: "paid",
      featured: true,
      published_at: "2023-01-01T12:00:00Z",
      tags: ["Patrons"],
      lexical: lexical([
        { type: "html", version: 1, html: "<p>A sample from the patrons’ edition.</p>" },
        { type: "paywall", version: 1 },
        { type: "html", version: 1, html: "<p>The complete patrons’ edition.</p>" },
      ]),
    });
    await publish("pages", {
      title: "Plate sizes",
      slug: "plates",
      lexical: lexical([
        { type: "html", version: 1, html: "<p>Illustrations from the archive.</p>" },
        ...["regular", "wide", "full"].map((cardWidth) => ({
          type: "image",
          version: 1,
          src: photo,
          alt: `The ${cardWidth} plate`,
          caption: `A ${cardWidth} plate`,
          cardWidth,
        })),
        {
          type: "html",
          version: 1,
          html: `<table><caption>Catalogue numbers</caption><tbody><tr>${Array.from({ length: 16 }, (_, i) => `<th scope="col">Shelf ${i + 1}</th>`).join("")}</tr></tbody></table>`,
        },
      ]),
    });
    for (let index = 0; index < pageSize; index++) {
      await publish("posts", {
        title: `Notebook ${index + 1}`,
        slug: `notebook-${index + 1}`,
        html: "<p>A short field note.</p>",
        tags: ["Books"],
        published_at: new Date(Date.UTC(2024, 0, index + 1)).toISOString(),
      });
    }
    await publish("posts", {
      title: "Members’ notebook",
      slug: "members-notebook",
      visibility: "members",
      published_at: "2025-02-01T12:00:00Z",
      html: "<p>Unpublished reading notes behind the gate.</p>",
    });
    await publish("posts", {
      title: "Reading room",
      slug: "reading-room",
      published_at: "2025-03-01T12:00:00Z",
      html: articleBody,
      feature_image: photo,
      feature_image_alt: "Light through a library window",
      feature_image_caption: "The east window",
      custom_excerpt: "Notes from the library.",
      tags: ["Books"],
      featured: true,
    });
    await publish("pages", {
      title: "About the library",
      slug: "about",
      html: "<p>Open on Sundays.</p>",
    });
    await publish("pages", {
      title: "Hidden page title",
      slug: "quiet",
      show_title_and_feature_image: false,
      html: "<h1>Inside the library</h1>",
    });
    await check(
      await admin.put("custom_theme_settings/", {
        data: {
          custom_theme_settings: [
            { key: "show_featured_posts", value: true },
            { key: "body_font", value: "Noto Sans JP" },
            { key: "heading_font", value: "System serif" },
          ],
        },
      }),
    );
    await capture("featured");
    await settings("locale", "ja");
    await capture("japanese");
    await capture("japanese-patrons", "tag/patrons/");
    await settings("locale", "ar");
    await capture("arabic");
    await settings("locale", "es-ar");
    await capture("spanish");
    await settings("locale", "en");
    await check(
      await admin.put("custom_theme_settings/", {
        data: { custom_theme_settings: [{ key: "show_featured_posts", value: false }] },
      }),
    );
    for (const level of ["free", "complimentary"] as const) {
      const created = await check(
        await admin.post("members/", {
          data: {
            members: [
              { email: `${level}@example.test`, tiers: level === "free" ? [] : [{ id: tier.id }] },
            ],
          },
        }),
      );
      const id = (await created.json()).members[0].id;
      const signin = await check(await admin.get(`members/${id}/signin_urls/`));
      const link = (await signin.json()).member_signin_urls[0].url;
      const member = await request.newContext({ baseURL: site });
      try {
        const session = await member.get(link);
        if (!session.ok()) throw new Error(`Member sign-in failed with HTTP ${session.status()}`);
        process.env[`GHOST_READER_${level}`] = JSON.stringify(
          (await member.storageState()).cookies,
        );
      } finally {
        await member.dispose();
      }
    }
  } finally {
    await admin.dispose();
  }
}
