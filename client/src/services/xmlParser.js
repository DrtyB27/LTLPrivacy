/**
 * Browser-side XML parser for 3G TMS Rating API responses.
 * Uses the browser's built-in DOMParser — no external dependencies.
 */

function getText(el, ...path) {
  let cur = el;
  for (const tag of path) {
    if (!cur) return '';
    // Look through child elements (ignore namespace prefixes)
    const children = cur.children ? Array.from(cur.children) : [];
    cur = children.find(c => c.localName === tag || c.tagName === tag);
  }
  return cur ? (cur.textContent || '').trim() : '';
}

function getAttr(el, attr) {
  return el ? (el.getAttribute(attr) || '') : '';
}

function getAll(el, tagName) {
  if (!el) return [];
  // getElementsByTagNameNS with wildcard for namespace
  const byNS = el.getElementsByTagNameNS('*', tagName);
  if (byNS.length > 0) return Array.from(byNS);
  return Array.from(el.getElementsByTagName(tagName));
}

function findFirst(el, tagName) {
  const all = getAll(el, tagName);
  return all.length > 0 ? all[0] : null;
}

export function parseRatingResponse(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return { rates: [], messages: ['XML parse error'], ratingMessage: 'XML parse error' };
  }

  // Extract messages
  const messages = [];
  const messageEls = getAll(doc, 'Message');
  for (const m of messageEls) {
    const content = getText(m, 'Content');
    if (content) messages.push(content);
  }

  // Extract rates
  const rateEls = getAll(doc, 'Rate');
  // Filter to only direct Rate children (not nested sub-elements named Rate)
  const topRates = rateEls.filter(r => {
    return r.parentElement && (r.parentElement.localName === 'Rates' || r.parentElement.localName === 'Results' || r.parentElement.localName === 'RatingResponse');
  });

  const rates = topRates.map((rate) => {
    // Carrier
    const carrierTP = findFirst(rate, 'CarrierTradingPartner');

    // Contract info
    const contractInfo = findFirst(rate, 'ContractInfo');
    const strategy = contractInfo ? findFirst(contractInfo, 'Strategy') : null;

    // Pricing
    const pricing = findFirst(rate, 'Pricing');
    const firstLIR = findFirst(rate, 'LineItemRate');

    // Service
    const service = findFirst(rate, 'Service');

    // Distance
    const distanceEl = findFirst(rate, 'TotalDistance');

    // Terminals
    const origTerminal = findFirst(rate, 'OriginTerminalInfo');
    const destTerminal = findFirst(rate, 'DestinationTerminalInfo');

    // Accessorials total
    const accBlock = pricing ? findFirst(pricing, 'Accessorials') : null;

    return {
      validRate: getText(rate, 'ValidRate') || getAttr(rate, 'ValidRate') || 'true',
      carrierSCAC: carrierTP ? getText(carrierTP, 'SCAC') : '',
      carrierRef: carrierTP ? getText(carrierTP, 'Ref') : '',
      carrierName: carrierTP ? getText(carrierTP, 'Name') : '',
      contractId: contractInfo ? getText(contractInfo, 'Id') : '',
      contractRef: contractInfo ? getText(contractInfo, 'Ref') : '',
      contractDescription: contractInfo ? getText(contractInfo, 'Description') : '',
      contractUse: contractInfo ? getText(contractInfo, 'Use') : '',
      contractStatus: contractInfo ? getText(contractInfo, 'Status') : '',
      strategyId: strategy ? getText(strategy, 'Id') : '',
      strategySequence: strategy ? getText(strategy, 'Sequence') : '',
      strategyDescription: strategy ? getText(strategy, 'Description') : '',
      transportMode: strategy ? getText(strategy, 'TransportMode') : '',
      ratingType: strategy ? getText(strategy, 'RatingType') : '',
      tierId: strategy ? getText(strategy, 'TierId') : '',
      firstClass: firstLIR ? getText(firstLIR, 'FreightClassification') : '',
      firstFAK: firstLIR ? getText(firstLIR, 'FAK') : '',
      tariffGross: parseFloat(pricing ? getText(pricing, 'StrategyTariffGross') : '0') || 0,
      tariffDiscount: parseFloat(pricing ? getText(pricing, 'StrategyTariffDiscount') : '0') || 0,
      tariffDiscountPct: parseFloat(pricing ? getText(pricing, 'StrategyTariffDiscountPercent') : '0') || 0,
      tariffNet: parseFloat(pricing ? getText(pricing, 'StrategyNetRate') : '0') || 0,
      netCharge: parseFloat(pricing ? getText(pricing, 'StrategyNet') : '0') || 0,
      accTotal: parseFloat(accBlock ? getText(accBlock, 'Total') : '0') || 0,
      totalCharge: parseFloat(pricing ? getText(pricing, 'Total') : '0') || 0,
      ratingDescription: pricing ? getText(pricing, 'RatingDescription') : '',
      serviceDays: parseInt(service ? getText(service, 'Days') : '0', 10) || 0,
      serviceDescription: service ? getText(service, 'Service') : '',
      estimatedDelivery: service ? getText(service, 'EstimatedDelivery') : '',
      distance: parseFloat(distanceEl ? (distanceEl.textContent || '0') : '0') || 0,
      distanceUOM: distanceEl ? getAttr(distanceEl, 'UOM') : '',
      origTerminalCode: origTerminal ? getText(origTerminal, 'Code') : '',
      origTerminalCity: origTerminal ? getText(origTerminal, 'City') : '',
      destTerminalCode: destTerminal ? getText(destTerminal, 'Code') : '',
      destTerminalCity: destTerminal ? getText(destTerminal, 'City') : '',
    };
  });

  return {
    rates,
    messages,
    ratingMessage: messages.join('; ') || (rates.length === 0 ? 'No contracted rates found' : ''),
  };
}
