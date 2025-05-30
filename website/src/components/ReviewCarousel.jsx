import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
// import "./ReviewCarousel.css"; // Optional: for more complex styles

// Fallback reviews if API fails or for initial setup
const fallbackReviews = [
  {
    id: "fallback-1",
    author: "Satisfied Customer A (Example)",
    text: "The Manakeesh here is absolutely divine! So fresh and flavorful.",
    rating: 5,
    source: "Example Source", // Add a source field
  },
  {
    id: "fallback-2",
    author: "Foodie Explorer (Example)",
    text: "A hidden gem! Authentic taste and friendly service. Will be back!",
    rating: 5,
    source: "Example Source",
  },
];

const ReviewCarousel = () => {
  const [reviews, setReviews] = useState(fallbackReviews);
  const [isLoading, setIsLoading] = useState(false); // Initially false if using fallback
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Replace with your actual API endpoint
        // Your backend would fetch from Yelp/Google here
        const response = await fetch("/api/reviews"); // Your backend endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Assuming the API returns an array of review objects similar to fallbackReviews
        // Ensure data has id, author, text, rating, and source
        if (data && data.length > 0) {
          setReviews(data);
        } else {
          // If API returns empty or invalid data, keep fallback or handle appropriately
          // setReviews(fallbackReviews); // Or set an empty array and show a message
          console.warn("Fetched reviews data is empty or invalid.");
        }
      } catch (e) {
        console.error("Failed to fetch reviews:", e);
        setError(e.message);
        setReviews(fallbackReviews); // Fallback to static reviews on error
      } finally {
        setIsLoading(false);
      }
    };

    // Uncomment to enable fetching when you have an API endpoint
    // fetchReviews();

    // If you want to stick with manually curated reviews for now,
    // you can just remove the useEffect or keep fetchReviews commented out.
    // In that case, ensure your manual reviews have a 'source' property.
  }, []); // Empty dependency array means this runs once on mount

  const settings = {
    dots: true,
    infinite: reviews.length > 1, // Only infinite if there's more than one review
    speed: 500,
    slidesToShow: Math.min(3, reviews.length), // Show up to 3, or fewer if not enough reviews
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(2, reviews.length),
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
    appendDots: (dots) => (
      <div style={{ bottom: "-40px" }}>
        <ul style={{ margin: "0px" }}> {dots} </ul>
      </div>
    ),
    customPaging: (i) => (
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: "var(--color-accent-subtle-gray)",
          margin: "0 5px",
        }}
      ></div>
    ),
  };

  if (isLoading && reviews === fallbackReviews) {
    // Show loading only if initial data isn't fallback
    return (
      <div
        style={{
          backgroundColor: "var(--color-primary-beige)",
          color: "var(--color-accent-dark-green)",
        }}
        className="py-12 text-center"
      >
        Loading reviews...
      </div>
    );
  }

  if (error && reviews === fallbackReviews) {
    // Show error only if still on fallback
    return (
      <div
        style={{
          backgroundColor: "var(--color-primary-beige)",
          color: "var(--color-accent-warm-brown)",
        }}
        className="py-12 text-center"
      >
        Failed to load reviews. Displaying examples.
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "var(--color-primary-beige)",
          color: "var(--color-accent-dark-green)",
        }}
        className="py-12 text-center"
      >
        No reviews to display at the moment.
      </div>
    );
  }

  return (
    <div
      className="review-carousel-container py-12"
      style={{ backgroundColor: "var(--color-primary-beige)" }}
    >
        <div className="text-center mb-16">
          {/* "Get In Touch" span: Primary Green */}
          <span className="text-primary-green font-semibold tracking-wider uppercase">
            First time here?
          </span>
          {/* "Contact Us" heading: Dark Green */}
          <h2 className="text-4xl font-bold mt-2 text-accent-dark-green">
            What Our Customers Say
          </h2>
          {/* Decorative line: Primary Green */}
          <div className="h-1 w-24 bg-primary-green mx-auto mt-4 rounded-full"></div>
        </div>
      <div className="max-w-6xl mx-auto px-4">
        <Slider {...settings}>
          {reviews.map((review) => (
            <div key={review.id || review.text.slice(0, 10)} className="p-4">
              {" "}
              {/* Ensure a unique key */}
              <div
                className="rounded-lg shadow-lg p-6 min-h-[220px] flex flex-col justify-between" // Slightly increased min-height for source line
                style={{ backgroundColor: "var(--color-accent-light-beige)" }}
              >
                <div>
                  <p
                    className="italic mb-4"
                    style={{ color: "var(--color-accent-dark-brown)" }}
                  >
                    "{review.text}"
                  </p>
                </div>
                <div>
                  <p
                    className="text-right font-semibold"
                    style={{ color: "var(--color-accent-warm-brown)" }}
                  >
                    - {review.author}
                  </p>
                  {review.rating && (
                    <div
                      className="text-right mt-1" // Star rating color
                      style={{ color: "var(--color-accent-warm-brown)" }}
                    >
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </div>
                  )}
                  {review.source && (
                    <p
                      className="text-right text-xs mt-1"
                      style={{ color: "var(--color-accent-subtle-gray)" }}
                    >
                      via {review.source}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
      <style jsx global>{`
        .slick-prev:before,
        .slick-next:before {
          color: var(--color-accent-dark-green) !important;
        }
        .slick-dots li.slick-active div {
          background: var(--color-accent-warm-brown) !important;
        }
      `}</style>
    </div>
  );
};

export default ReviewCarousel;
