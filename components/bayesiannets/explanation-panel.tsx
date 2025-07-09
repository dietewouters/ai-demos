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
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4">
            Wat zijn Bayesiaanse Netwerken?
          </h3>
          <p className="mb-4">
            Bayesiaanse netwerken zijn grafische modellen die kansrelaties
            tussen variabelen weergeven. Ze combineren principes uit
            grafentheorie, kansrekening en statistiek om complexe
            waarschijnlijkheidsverdelingen compact weer te geven.
          </p>
          <p>
            In een Bayesiaans netwerk wordt elke variabele weergegeven als een
            knoop (node), en de pijlen tussen knopen vertegenwoordigen directe
            causale of statistische relaties.
          </p>

          <div className="my-6">
            <h4 className="text-lg font-medium mb-2">
              Belangrijkste kenmerken:
            </h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Gerichte acyclische graaf (DAG)</strong>: Een netwerk
                zonder cyclische verbindingen, wat betekent dat een knoop niet
                zijn eigen voorouder kan zijn.
              </li>
              <li>
                <strong>Voorwaardelijke kansen</strong>: Elke knoop heeft een
                voorwaardelijke kanstabel (CPT) die de kans op die variabele
                geeft, gegeven de toestand van zijn ouders.
              </li>
              <li>
                <strong>Gezamenlijke kansverdeling</strong>: Het netwerk
                vertegenwoordigt de volledige gezamenlijke kansverdeling over
                alle variabelen op een compacte manier.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="math">
          <AccordionTrigger>
            De wiskunde achter Bayesiaanse netwerken
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>
              De kernformule voor Bayesiaanse netwerken is de kettingregel voor
              kansen, die de gezamenlijke kansverdeling van alle variabelen
              uitdrukt als het product van voorwaardelijke kansen:
            </p>
            <div className="p-4 bg-muted rounded-md overflow-x-auto">
              <p className="text-center font-mono">
                P(X₁, X₂, ..., Xₙ) = P(X₁) × P(X₂|X₁) × ... × P(Xₙ|ouders(Xₙ))
              </p>
            </div>
            <p>
              Waar P(Xᵢ|ouders(Xᵢ)) de voorwaardelijke kans is van variabele Xᵢ
              gegeven zijn ouders in het netwerk.
            </p>
            <p className="mt-4">
              <strong>Stelling van Bayes:</strong> De basis voor Bayesiaanse
              inferentie is:
            </p>
            <div className="p-4 bg-muted rounded-md overflow-x-auto">
              <p className="text-center font-mono">
                P(A|B) = P(B|A) × P(A) / P(B)
              </p>
            </div>
            <p>
              Waar:
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>P(A|B) is de posteriori kans: de kans op A gegeven B.</li>
                <li>
                  P(B|A) is de likelihood: hoe waarschijnlijk B is als A waar
                  is.
                </li>
                <li>
                  P(A) is de prior kans: onze aanvankelijke overtuiging over A.
                </li>
                <li>
                  P(B) is de marginale likelihood: een normalisatiefactor.
                </li>
              </ul>
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="inference">
          <AccordionTrigger>
            Inferentie in Bayesiaanse netwerken
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>
              Inferentie is het proces van het berekenen van de kans op bepaalde
              variabelen gegeven bewijs (evidence) over andere variabelen. Er
              zijn verschillende typen inferentie:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Exacte inferentie</strong>: Berekent de exacte kansen,
                maar is NP-hard voor algemene netwerken. Algoritmen hiervoor
                zijn:
                <ul className="list-disc pl-6 mt-1">
                  <li>Variable elimination</li>
                  <li>Junction tree algoritme</li>
                </ul>
              </li>
              <li>
                <strong>Benaderende inferentie</strong>: Geeft goede schattingen
                voor grote netwerken:
                <ul className="list-disc pl-6 mt-1">
                  <li>Monte Carlo sampling</li>
                  <li>Belief propagation</li>
                </ul>
              </li>
            </ul>
            <p className="mt-2">
              In deze demo gebruiken we een vereenvoudigde vorm van inferentie
              voor demonstratiedoeleinden.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="example">
          <AccordionTrigger>
            Voorbeeld: Het Regen-Sprinkler-Nat Gras Model
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>
              Het standaardvoorbeeld dat we in deze demo gebruiken is het
              "Regen-Sprinkler-Nat Gras" voorbeeld:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Regen</strong>: De kans dat het regent (een root-node
                zonder ouders)
              </li>
              <li>
                <strong>Sprinkler</strong>: De kans dat de sprinkler aanstaat,
                beïnvloed door regen (meestal staat de sprinkler uit als het
                regent)
              </li>
              <li>
                <strong>Nat Gras</strong>: De kans dat het gras nat is,
                beïnvloed door zowel regen als de sprinkler
              </li>
            </ul>
            <p className="mt-2">
              Dit eenvoudige netwerk laat belangrijke eigenschappen zien zoals:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Voorwaardelijke onafhankelijkheid (sprinkler en regen zijn
                onafhankelijk zonder evidence)
              </li>
              <li>
                Explaining away (als we weten dat het gras nat is, dan maakt
                bewijs voor regen sprinkler minder waarschijnlijk)
              </li>
              <li>
                Inferentie in beide richtingen (van oorzaken naar gevolgen en
                andersom)
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="applications">
          <AccordionTrigger>
            Toepassingen van Bayesiaanse netwerken
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>Bayesiaanse netwerken worden in veel domeinen toegepast:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Medische diagnose</strong>: Voorspellen van ziektes op
                basis van symptomen en risicofactoren
              </li>
              <li>
                <strong>Risicobeoordeling</strong>: Modelleren van onzekerheden
                in complexe systemen
              </li>
              <li>
                <strong>Forensisch onderzoek</strong>: Evalueren van bewijs in
                juridische context
              </li>
              <li>
                <strong>Computer vision</strong>: Objectherkenning en
                classificatie
              </li>
              <li>
                <strong>Natuurlijke taalverwerking</strong>: Taalbegrip en
                sentiment-analyse
              </li>
              <li>
                <strong>Bioinformatica</strong>: Genexpressie en biologische
                netwerken
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
