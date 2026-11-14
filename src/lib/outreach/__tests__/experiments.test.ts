import { describe, expect, it } from "vitest";
import { EXPERIMENTS, activeExperiment, assignArm, evaluateExperiment, probBBeatsA, subjectFor, type Experiment } from "../experiments";

const exp: Experiment = { ...EXPERIMENTS[0], approved: true };

describe("experiments", () => {
  it("ships the touch-1 subject test unapproved, so nothing changes until Farjad signs off", () => {
    expect(EXPERIMENTS.every((e) => !e.approved)).toBe(true);
    expect(activeExperiment(1)).toBeNull();
    expect(activeExperiment(1, [exp])).toBe(exp);
    expect(activeExperiment(1, [{ ...exp, concluded: true }])).toBeNull();
  });

  it("assigns a lead to the same arm every time and splits roughly 50/50", () => {
    expect(assignArm(exp, "lead-1").id).toBe(assignArm(exp, "lead-1").id);
    const b = Array.from({ length: 1000 }, (_, i) => assignArm(exp, `lead-${i}`).id).filter((id) => id === "B").length;
    expect(b).toBeGreaterThan(450);
    expect(b).toBeLessThan(550);
  });

  it("keeps the template subject for the control and builds the challenger subject", () => {
    expect(subjectFor(exp.arms[0], "SARAH", "Your CICC listing is on Verixa, Sarah")).toBe("Your CICC listing is on Verixa, Sarah");
    expect(subjectFor(exp.arms[1], "SARAH", "x")).toBe("Sarah, your Verixa profile is ready to claim");
    expect(subjectFor(exp.arms[1], "", "x")).toBe("Your Verixa profile is ready to claim");
  });

  it("computes P(B > A) for Beta posteriors", () => {
    expect(probBBeatsA({ a: 5, b: 5 }, { a: 5, b: 5 })).toBeCloseTo(0.5, 2);
    expect(probBBeatsA({ a: 2, b: 98 }, { a: 20, b: 80 })).toBeGreaterThan(0.99);
  });

  it("never declares a winner before the minimum sample, however big the gap", () => {
    const r = evaluateExperiment(exp, [{ armId: "A", sent: 40, replies: 0 }, { armId: "B", sent: 40, replies: 10 }]);
    expect(r.status).toBe("collecting");
    expect(r.pChallengerBetter).toBeNull();
  });

  it("declares the challenger past the minimum sample only with a clear gap", () => {
    expect(evaluateExperiment(exp, [{ armId: "A", sent: 100, replies: 3 }, { armId: "B", sent: 100, replies: 12 }]).status).toBe("winner");
    expect(evaluateExperiment(exp, [{ armId: "A", sent: 100, replies: 5 }, { armId: "B", sent: 100, replies: 6 }]).status).toBe("collecting");
    expect(evaluateExperiment(exp, [{ armId: "A", sent: 200, replies: 10 }, { armId: "B", sent: 200, replies: 11 }]).status).toBe("keep_control");
  });

  it("reports an unapproved experiment as waiting for approval", () => {
    expect(evaluateExperiment(EXPERIMENTS[0], []).status).toBe("waiting_approval");
  });
});
