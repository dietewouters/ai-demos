"use client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ExplanationPanel() {
  return (
    <div>
      <p className="mt-6">
        <h2 className="text-xl font-semibold">Scenario</h2>
        <p className="text-gray-700">
          In your local nuclear power station, there is an alarm that senses
          when a temperature gauge exceeds a given threshold. The gauge measures
          the temperature of the core.
        </p>
      </p>
      <br />
      <p className="mt=6">
        <h3 className="text-xl font-semibold">Variables</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>
            <strong>A</strong>: Alarm sounds (Boolean - true if sounds)
          </li>
          <li>
            <strong>
              F<sub>A</sub>
            </strong>
            : Alarm is faulty (Boolean - true if faulty)
          </li>
          <li>
            <strong>
              F<sub>G</sub>
            </strong>
            : Gauge is faulty (Boolean - true if faulty)
          </li>
          <li>
            <strong>G</strong>: Gauge reading (Boolean - normal (true) or high
            (false))
          </li>
          <li>
            <strong>T</strong>: Actual core temperature (Boolean - normal (true)
            or high (false))
          </li>
        </ul>
      </p>
    </div>
  );
}
