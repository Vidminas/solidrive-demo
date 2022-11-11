export function generateTripRequest() {
  return {
    id: crypto.randomUUID(),
    payment: Math.round(Math.random() * 10000) / 100,
    distance: Math.round(Math.random() * 230) / 10,
  };
}

const reviews = [
  "Awful journey, I threw up and the car smelled",
  "Nice and fast, thanks for the ride!",
  "Ran a red light 😲",
  "Too slow, missed my flight",
  "Same as usual",
  "Have a tip",
  "I used to be a driver like you, but then I took an arrow to the knee",
  "I wish I had a car myself",
  "This city is way too damn expensive!",
  "Excellent chat and pleasant driver",
  "I learned a lot about seals, thanks!",
  "The radio was not my taste 👎",
];

export function generatePassengerReview() {
  const shouldLeaveReview = Math.random() >= 0.5;
  if (!shouldLeaveReview) {
    return null;
  }
  const idx = Math.floor(Math.random() * reviews.length);
  return reviews[idx];
}
