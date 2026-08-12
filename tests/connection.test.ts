import assert from "node:assert/strict";
import test from "node:test";
import {
  formatIndianMobile,
  normalizeIndianMobile,
  ownerToRespondentMessage,
  respondentToOwnerMessage,
  whatsappUrl,
} from "../lib/connection.ts";

test("common Indian mobile formats normalize for WhatsApp", () => {
  assert.equal(normalizeIndianMobile("9876543210"), "919876543210");
  assert.equal(normalizeIndianMobile("+919876543210"), "919876543210");
  assert.equal(normalizeIndianMobile("91 98765 43210"), "919876543210");
  assert.equal(normalizeIndianMobile("+91 98765 43210"), "919876543210");
  assert.equal(formatIndianMobile("+91 98765 43210"), "+91 98765 43210");
});

test("invalid phone does not generate a wa.me URL", () => {
  assert.equal(normalizeIndianMobile("12345"), null);
  assert.equal(formatIndianMobile("12345"), null);
  assert.equal(whatsappUrl("12345", "Hello"), null);
});

test("WhatsApp handoff encodes owner-to-respondent REQ context", () => {
  const message = ownerToRespondentMessage({
    respondentName: "Amit Khanna",
    localities: ["Defence Colony", "GK I"],
    budgetLabel: "₹12–15 Cr",
  });
  assert.equal(
    message,
    "Hi Amit, connecting regarding your match for my Defence Colony + GK I ₹12–15 Cr REQ on REQ.",
  );
  assert.equal(
    whatsappUrl("+91 98765 43210", message),
    `https://wa.me/919876543210?text=${encodeURIComponent(message)}`,
  );
});

test("WhatsApp handoff encodes respondent-to-owner REQ context", () => {
  assert.equal(
    respondentToOwnerMessage({
      ownerName: "Shivam Sood",
      localities: ["Defence Colony"],
      budgetLabel: "₹12–15 Cr",
    }),
    "Hi Shivam, connecting regarding my match for your Defence Colony ₹12–15 Cr REQ on REQ.",
  );
});
