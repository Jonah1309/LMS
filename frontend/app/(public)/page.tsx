import Navbar from "@/components/layout/Navbar";
import Link from "next/link";

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  price_usd: number;
  price_inr: number;
  status: string;
  thumbnail_url: string | null;
}

const CARD_GRADIENTS = [
  "from-brand-600 to-brand-400",
  "from-gold-500 to-orange-400",
  "from-emerald-600 to-teal-400",
  "from-pink-500 to-rose-400",
  "from-sky-500 to-blue-400",
  "from-violet-500 to-purple-400",
];

const CARD_EMOJIS = ["📖", "🙏", "✝", "🕊", "⛪", "🌿"];

async function getPublishedCourses(): Promise<Course[]> {
  try {
    const res = await fetch("http://localhost:8000/api/v1/courses", {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const courses = await getPublishedCourses();

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block bg-gold-500 text-brand-900 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            Ministry Education Platform
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Grow Deeper in <span className="text-gold-400">Faith &amp; Knowledge</span>
          </h1>
          <p className="text-lg text-slate-200 mb-8 max-w-xl mx-auto">
            Structured courses led by trusted instructors — covering theology, scripture, and spiritual
            formation. Learn at your own pace, from anywhere.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/courses"
              className="px-8 py-3 bg-gold-500 text-brand-900 font-bold rounded-lg hover:bg-gold-400 text-lg transition"
            >
              Explore Courses →
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 border border-white text-white rounded-lg hover:bg-white hover:text-brand-900 text-lg transition"
            >
              Get Started Free
            </Link>
          </div>
          <div className="mt-12 flex justify-center gap-12 text-center">
            <div>
              <div className="text-3xl font-bold text-gold-400">{courses.length}+</div>
              <div className="text-slate-300 text-sm">Courses</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gold-400">4.9★</div>
              <div className="text-slate-300 text-sm">Avg Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="max-w-6xl mx-auto py-16 px-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-brand-900">Featured Courses</h2>
          <Link href="/courses" className="text-brand-600 text-sm hover:underline">
            View all courses →
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg">No courses published yet.</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {courses.map((c, i) => (
              <Link
                key={c.id}
                href={`/courses/${c.slug}`}
                className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition group block"
              >
                {/* Thumbnail */}
                <div
                  className={`h-44 flex items-center justify-center text-5xl relative overflow-hidden ${
                    c.thumbnail_url ? "" : `bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]}`
                  }`}
                >
                  {c.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <span>{CARD_EMOJIS[i % CARD_EMOJIS.length]}</span>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition" />
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-brand-900 mb-1 line-clamp-2">{c.title}</h3>
                  {c.description && (
                    <p className="text-slate-500 text-sm mb-3 line-clamp-2">{c.description}</p>
                  )}
                  <div className="flex items-center justify-between border-t pt-3 mt-3">
                    <span className="font-bold text-brand-700">
                      {c.price_inr > 0 ? (
                        <>
                          ₹{c.price_inr.toLocaleString("en-IN")}
                          {c.price_usd > 0 && (
                            <span className="text-slate-400 font-normal text-xs ml-1">/ ${c.price_usd}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-green-600">Free</span>
                      )}
                    </span>
                    <span className="text-sm bg-brand-600 text-white px-4 py-1.5 rounded-lg group-hover:bg-brand-700 transition">
                      Enroll Now
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-brand-900 text-white/60 text-sm py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center text-brand-900 text-xs font-bold">
            ✝
          </div>
          <span className="text-white font-semibold">Forgiven Generation Church</span>
        </div>
        <p>© {new Date().getFullYear()} Forgiven Generation Church. All rights reserved.</p>
      </footer>
    </>
  );
}
