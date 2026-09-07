// /api/feed.js
// Serverless function di Vercel. Jalan di server, BUKAN di browser,
// jadi AIO_USERNAME dan AIO_KEY tidak pernah terlihat oleh pengunjung web.

export default async function handler(req, res) {
  const { AIO_USERNAME, AIO_KEY } = process.env;

  if (!AIO_USERNAME || !AIO_KEY) {
    return res.status(500).json({
      error: "AIO_USERNAME / AIO_KEY belum diset di Environment Variables Vercel"
    });
  }

  const feed = req.query.feed || "jalur-a";
  const limit = req.query.limit || 30;
  const startTime = req.query.start_time;
  const endTime = req.query.end_time;

  try {
    const params = new URLSearchParams();
    params.set("limit", limit);
    if (startTime) params.set("start_time", startTime);
    if (endTime) params.set("end_time", endTime);

    const url = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${feed}/data?${params.toString()}`;
    const response = await fetch(url, {
      headers: { "X-AIO-Key": AIO_KEY }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Adafruit IO merespons status ${response.status}`
      });
    }

    const data = await response.json();

    // Teruskan header X-Pagination-* dari Adafruit IO ke browser. Header ini
    // berguna untuk diagnostik: X-Pagination-Total = jumlah total data point
    // yang SESUNGGUHNYA tersimpan di feed ini menurut Adafruit IO sendiri,
    // jadi bisa dibandingkan dengan jumlah baris yang berhasil dimuat dashboard
    // (lihat dokumen resmi: io.adafruit.com/blog/features/2019/02/14/adafruit-io-pagination-api/)
    const paginationHeaders = ['x-pagination-total', 'x-pagination-limit', 'x-pagination-start', 'x-pagination-end', 'x-pagination-count'];
    paginationHeaders.forEach((h) => {
      const val = response.headers.get(h);
      if (val !== null) res.setHeader(h, val);
    });

    // Cache singkat di edge Vercel supaya tidak membebani limit request Adafruit IO
    res.setHeader("Cache-Control", "s-maxage=4, stale-while-revalidate=8");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
