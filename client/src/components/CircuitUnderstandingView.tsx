/**
 * CircuitLens — Circuit Theory & Functional Understanding Component
 *
 * Provides in-depth theoretical explanations, identified component roles,
 * expected nominal electrical behavior, failure mechanisms, and an interactive
 * functional block diagram distinguishing confirmed vs inferred connections.
 */

import React, { useState } from 'react';
import type { Translations } from '../i18n.ts';
import type {
  CircuitTheoryUnderstanding,
  CircuitBlockNode,
  AnalysisDepth,
} from '../types/diagnosis.ts';

interface CircuitUnderstandingViewProps {
  boardName: string;
  understanding?: CircuitTheoryUnderstanding;
  analysisDepth?: AnalysisDepth;
  t: Translations;
}

export const CircuitUnderstandingView: React.FC<CircuitUnderstandingViewProps> = ({
  boardName,
  understanding,
  analysisDepth = 'standard',
  t,
}) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  if (!understanding) {
    return (
      <div className="card-panel circuit-understanding-panel empty-state">
        <div className="card-header">
          <div className="card-title-group">
            <h3 className="card-title">
              {boardName ? `${boardName} — ` : ''}
              {t.theorySectionTitle || 'Circuit Theory & Understanding'}
            </h3>
            <p className="intake-section-desc">
              {t.theorySectionSubtitle || 'Theoretical operating principles, component functions, and functional block relationships.'}
            </p>
          </div>
        </div>
        <div className="empty-understanding-box">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
          <p>{t.noTheoryAvailable || 'No specific circuit theory model generated for this assessment. Run diagnosis or select Advanced depth to generate circuit understanding.'}</p>
        </div>
      </div>
    );
  }

  const {
    operatingPrinciple,
    expectedBehavior,
    failureMechanismTheory,
    functionalBlocks = [],
    blockConnections = [],
    relevantComponents = [],
    diagramLimitations,
  } = understanding;

  const selectedBlock = functionalBlocks.find((b) => b.id === selectedBlockId) || null;
  const incomingConns = blockConnections.filter((c) => c.to === selectedBlockId);
  const outgoingConns = blockConnections.filter((c) => c.from === selectedBlockId);

  const getCategoryClass = (cat: CircuitBlockNode['category']) => {
    switch (cat) {
      case 'power_input':
        return 'cat-power';
      case 'protection':
        return 'cat-protection';
      case 'regulation':
        return 'cat-regulation';
      case 'control':
        return 'cat-control';
      case 'signal_processing':
        return 'cat-comm';
      case 'output_load':
        return 'cat-load';
      default:
        return 'cat-default';
    }
  };

  const getCategoryLabel = (cat: CircuitBlockNode['category']) => {
    switch (cat) {
      case 'power_input':
        return 'Power Input';
      case 'protection':
        return 'Protection';
      case 'regulation':
        return 'Regulation';
      case 'control':
        return 'Control & MCU';
      case 'signal_processing':
        return 'Signal / Comm';
      case 'output_load':
        return 'Headers & Loads';
      default:
        return cat;
    }
  };

  return (
    <div className="card-panel circuit-understanding-panel" id="circuit-theory-panel">
      {/* Panel Header */}
      <div className="card-header">
        <div className="card-title-group">
          <div className="title-row">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="section-icon"
              aria-hidden="true"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <h3 className="card-title">
              {boardName ? `${boardName} — ` : ''}
              {t.theorySectionTitle || 'Circuit Theory & Understanding'}
            </h3>
          </div>
          <p className="intake-section-desc">
            {t.theorySectionSubtitle || 'Theoretical operating principles, component functions, and functional block relationships.'}
          </p>
        </div>
        <div className="theory-header-meta">
          <span className="stage-status-badge depth-indicator-badge">
            Depth: <strong>{analysisDepth.toUpperCase()}</strong>
          </span>
          <span className="stage-status-badge blocks-count-badge">
            {functionalBlocks.length} Blocks • {blockConnections.length} Pathways
          </span>
        </div>
      </div>

      {/* Prominent Schematic Limitation Disclaimer Banner */}
      <div className="theory-disclaimer-banner" role="note">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="disclaimer-icon"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>
          <strong>Analytical Engineering Model:</strong>{' '}
          {diagramLimitations ||
            t.theoryDisclaimerNotice ||
            'This functional block diagram and circuit theory model represent logical deductions derived from PCB topography and reported symptoms. It does not replace an official manufacturer schematic. Always verify in-circuit connections with physical test probes before component isolation or rework.'}
        </p>
      </div>

      {/* 1. Operating Principles & Theory Cards Grid */}
      <div className="theory-cards-grid">
        <div className="theory-card card-principle">
          <div className="theory-card-header">
            <span className="card-icon" aria-hidden="true">⚡</span>
            <h4 className="theory-card-title">{t.theoryOperatingPrinciples || 'Operating Principle & Topology'}</h4>
          </div>
          <p className="theory-card-body">{operatingPrinciple}</p>
        </div>

        <div className="theory-card card-expected">
          <div className="theory-card-header">
            <span className="card-icon" aria-hidden="true">📏</span>
            <h4 className="theory-card-title">{t.theoryExpectedBehavior || 'Expected Nominal Electrical Parameters'}</h4>
          </div>
          <p className="theory-card-body">{expectedBehavior}</p>
        </div>

        <div className="theory-card card-failure">
          <div className="theory-card-header">
            <span className="card-icon" aria-hidden="true">🔍</span>
            <h4 className="theory-card-title">{t.theoryFailureMechanism || 'Failure Mechanism Analysis'}</h4>
          </div>
          <p className="theory-card-body">{failureMechanismTheory}</p>
        </div>
      </div>

      {/* 2. Functional Block Diagram Section */}
      {functionalBlocks.length > 0 && (
        <section className="block-diagram-section" aria-labelledby="block-diagram-heading">
          <div className="diagram-section-header">
            <div>
              <h4 id="block-diagram-heading" className="diagram-heading">
                {t.theoryFunctionalBlockDiagram || 'Functional Block Diagram'}
              </h4>
              <p className="diagram-subtitle">
                Interactive functional pathways. Click any block to view connected signals, components, and status.
              </p>
            </div>
            {/* Status Legend */}
            <div className="diagram-legend">
              <span className="legend-item">
                <span className="status-dot dot-confirmed" aria-hidden="true" />
                <span>{t.theoryConfirmed || 'Confirmed Landmark'}</span>
              </span>
              <span className="legend-item">
                <span className="status-dot dot-inferred" aria-hidden="true" />
                <span>{t.theoryInferred || 'Inferred Function'}</span>
              </span>
              <span className="legend-item">
                <span className="status-dot dot-unknown" aria-hidden="true" />
                <span>{t.theoryUnknown || 'Unknown / Unverified'}</span>
              </span>
            </div>
          </div>

          {/* Interactive Block Diagram Grid */}
          <div className="block-diagram-grid" role="region" aria-label="Circuit Functional Blocks">
            {functionalBlocks.map((block) => {
              const isSelected = selectedBlockId === block.id;

              return (
                <div
                  key={block.id}
                  className={`diagram-block-card ${getCategoryClass(block.category)} status-${block.status} ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedBlockId(isSelected ? null : block.id);
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${block.label} (${getCategoryLabel(block.category)}, status ${block.status})`}
                >
                  <div className="block-card-header">
                    <span className="block-category-pill">{getCategoryLabel(block.category)}</span>
                    <span className={`block-status-pill status-${block.status}`}>
                      {block.status === 'confirmed'
                        ? 'Confirmed'
                        : block.status === 'inferred'
                        ? 'Inferred'
                        : 'Unverified'}
                    </span>
                  </div>

                  <h5 className="block-title">{block.label}</h5>
                  <p className="block-desc">{block.description}</p>

                  {block.components && block.components.length > 0 && (
                    <div className="block-components-chips">
                      {block.components.map((comp) => (
                        <code key={comp} className="block-comp-chip">
                          {comp}
                        </code>
                      ))}
                    </div>
                  )}
                  <span className="block-inspect-hint">
                    {isSelected ? 'Click to deselect' : 'Click to inspect pathways'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Selected Block Inspection Detail Drawer */}
          {selectedBlock && (
            <div className="selected-block-detail-panel" aria-live="polite">
              <div className="detail-panel-header">
                <div>
                  <span className="detail-tag">{getCategoryLabel(selectedBlock.category)}</span>
                  <h5 className="detail-title">{selectedBlock.label}</h5>
                </div>
                <button
                  type="button"
                  className="close-detail-btn"
                  onClick={() => setSelectedBlockId(null)}
                  aria-label="Close details"
                >
                  ✕
                </button>
              </div>

              <div className="detail-connections-grid">
                <div className="connections-col">
                  <h6>Inputs & Supplies</h6>
                  {incomingConns.length === 0 ? (
                    <p className="no-conn-text">No documented upstream supply paths.</p>
                  ) : (
                    <ul className="conn-list">
                      {incomingConns.map((c, i) => (
                        <li key={i} className={`conn-item conn-${c.signalType}`}>
                          <span className="conn-type-badge">{c.signalType.toUpperCase()}</span>
                          <span className="conn-from">
                            From: <strong>{functionalBlocks.find((b) => b.id === c.from)?.label || c.from}</strong>
                          </span>
                          {c.description && <span className="conn-desc">— {c.description}</span>}
                          <span className={`conn-status-pill status-${c.status}`}>
                            {c.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="connections-col">
                  <h6>Outputs & Distribution</h6>
                  {outgoingConns.length === 0 ? (
                    <p className="no-conn-text">Terminal block or no downstream distribution.</p>
                  ) : (
                    <ul className="conn-list">
                      {outgoingConns.map((c, i) => (
                        <li key={i} className={`conn-item conn-${c.signalType}`}>
                          <span className="conn-type-badge">{c.signalType.toUpperCase()}</span>
                          <span className="conn-to">
                            To: <strong>{functionalBlocks.find((b) => b.id === c.to)?.label || c.to}</strong>
                          </span>
                          {c.description && <span className="conn-desc">— {c.description}</span>}
                          <span className={`conn-status-pill status-${c.status}`}>
                            {c.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. Component Functional Roles Table */}
      {relevantComponents && relevantComponents.length > 0 && (
        <section className="component-roles-section" aria-labelledby="comp-roles-heading">
          <div className="section-title-wrap">
            <h4 id="comp-roles-heading" className="roles-heading">
              {t.theoryComponentRoles || 'Identified Component Functions & Roles'}
            </h4>
            <p className="roles-subtitle">
              Key semiconductor landmarks and protection passives identified on the board.
            </p>
          </div>

          <div className="table-responsive-wrapper">
            <table className="component-roles-table">
              <thead>
                <tr>
                  <th>Designator / Part</th>
                  <th>Circuit Function & Role</th>
                  <th>Landmark Confidence</th>
                </tr>
              </thead>
              <tbody>
                {relevantComponents.map((comp, idx) => (
                  <tr key={idx}>
                    <td className="comp-designator-cell">
                      <code>{comp.designator}</code>
                    </td>
                    <td className="comp-function-cell">{comp.function}</td>
                    <td className="comp-status-cell">
                      <span className={`role-status-badge status-${comp.status}`}>
                        {comp.status === 'confirmed'
                          ? (t.theoryConfirmed || 'Confirmed')
                          : comp.status === 'inferred'
                          ? (t.theoryInferred || 'Inferred')
                          : (t.theoryUnknown || 'Unknown')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
