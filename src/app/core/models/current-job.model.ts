// The CurrentJob used by the current jobs list and dashboard. The C# class wasn't in the files we
// had, so the fields are worked out from how the pages use them. Check against the API response.
export interface CurrentJob {
  jobID: string;
  jobName: string;
  address?: string;
  createdBy?: string;
  /** Sage job status: Bid, Refused, Contract, Current, Complete or Closed. */
  status?: string;
  /** Percent complete, 0 to 100 (actrec.pctcmp). */
  percentComplete?: number;
}
