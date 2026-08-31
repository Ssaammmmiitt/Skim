import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

describe("Card", () => {
  it("renders article card layout", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Story headline</CardTitle>
          <CardDescription>Source · 2h ago</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Summary text</p>
        </CardContent>
      </Card>
    );

    expect(screen.getByText("Story headline")).toBeInTheDocument();
    expect(screen.getByText("Summary text")).toBeInTheDocument();
  });
});
