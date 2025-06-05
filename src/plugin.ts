/* eslint-disable @typescript-eslint/no-explicit-any */

figma.showUI(__html__, { width: 450, height: 900 });

let isGenerating = false;
let shouldStop = false;

// Define library types
type LibraryId = 'slds' | 'libA' | 'libB' | 'libC';

type LibraryConfig = {
  name: string;
  fileKey: string;
};

type LibraryConfigs = {
  [key in LibraryId]: LibraryConfig;
};

// Add library configuration
const LIBRARY_CONFIG: LibraryConfigs = {
  slds: {
    name: "Test Design System",
    fileKey: "QdMPM4oxxfAMd4npexRQQL",
  },
  libA: {
    name: "Test Design System",
    fileKey: "QdMPM4oxxfAMd4npexRQQL",
  },
  libB: {
    name: "Test Design System",
    fileKey: "QdMPM4oxxfAMd4npexRQQL",
  },
  libC: {
    name: "Additional File",
    fileKey: "RiY2reCmbX0Jyq7QAFL8SE",
  }
};

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate") {
    if (isGenerating) {
      figma.notify("Already generating a design. Please wait or stop the current generation.", { error: true });
      return;
    }

    // Always use all libraries
    const libraryIds: LibraryId[] = ['slds', 'libA', 'libB', 'libC'];
    const selectedLibraryConfigs = libraryIds.map(id => LIBRARY_CONFIG[id]).filter(Boolean);
    if (!selectedLibraryConfigs.length) {
      figma.notify("Error: No valid libraries found", { error: true });
      figma.ui.postMessage({ type: "complete", success: false });
      return;
    }

    isGenerating = true;
    shouldStop = false;
    try {
      await renderComponents(msg.prompt, libraryIds);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      isGenerating = false;
      shouldStop = false;
    }
  } else if (msg.type === "stop") {
    if (isGenerating) {
      shouldStop = true;
      isGenerating = false;
      figma.notify("Generation stopped");
      figma.ui.postMessage({ type: "complete", success: false });
    }
  } else if (msg.type === "clearCache") {
    figma.notify("Component cache cleared");
    figma.ui.postMessage({ type: "cacheCleared" });
  }
};

async function getLLMResponse(
  availableComponents: any[],
  userPrompt: string,
  libraryConfig: typeof LIBRARY_CONFIG[keyof typeof LIBRARY_CONFIG]
): Promise<any> {
  const availablePageNames = [
    ...new Set(
      availableComponents.map((comp) => ({
        type: comp.containing_frame.name,
        variant: comp.name,
        key: comp.key
      }))
    ),
  ];

  // Group components by type for better variant selection
  const componentGroups = availablePageNames.reduce((acc, comp) => {
    if (!acc[comp.type]) {
      acc[comp.type] = [];
    }
    acc[comp.type].push(comp.variant);
    return acc;
  }, {} as Record<string, string[]>);

  // Build the component groups string for the prompt
  const componentGroupsString = Object.entries(componentGroups)
    .map(([type, variants]) => `- ${type}:
${variants.map((v) => '  * ' + v).join('\n')}`)
    .join('\n');

  try {
    console.log("Sending request to local server...");
    const response = await fetch("http://localhost:3000/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt: userPrompt,
        libraryId: libraryConfig.name,
        systemPrompt: `You are a UI/UX design expert creating high-quality, professional designs with exceptional customer experience using the ${libraryConfig.name} library. Follow these guidelines:

## 1. Design Focus (PRIMARY REQUIREMENT)
- Generate desktop-first designs by default
- Target desktop screen sizes (width = 1440px)
- Use desktop-optimized layouts and components
- Consider mobile responsiveness as a secondary requirement
- Add 64px margin between two generated frames

## 2. Global Header Requirements (MUST BE INCLUDED IN EVERY PAGE)
- Every screen MUST include a global header and global navigation at the top with no padding above
- Global header and global navigation must be the first two components in the layout
- Global header and global navigation MUST span the full width of the screen
- Global header and global navigation MUST be of 1440px width!!!
- Global header and global navigation must be visible at all times (sticky positioning)
- Use the Global Navigation of any first variant available in the library
- The Global Navigation component should be used with its default variant unless specified otherwise
- **Limit the number of actions/buttons in the page header to a maximum of 3, prioritizing the most important actions.**



## 3. Component Selection Guidelines

### Component Selection Logic

**Information Architecture:**
- Cards for grouping content
- Accordions/Expandable Sections for collapsible content
- Tabs for major sections
- Scoped Tabs for sub-navigation

**User Input Needs:**
- Text entry → Input or Textarea
- Single selection → Radio Group or Combobox
- Multiple selection → Checkbox Group or Multi-select Combobox
- Binary choice → Checkbox or Toggle
- File upload → File Selector
- Visual selection → Visual Picker

**Actions:**
- Primary actions → Button (primary variant)
- Multiple related actions → Button Group
- Context actions → Menu
- Page-level actions → Page Header buttons (max 3)

**Navigation:**
- Hierarchical → Breadcrumb
- App sections → Global Navigation
- Within a page → Tabs or Scoped Tabs
- Within a record → Activity Timeline

**User Feedback:**
- Persistent messages → Scoped Notifications
- Temporary feedback → Toast
- Action confirmation → Notification
- Process completion → Modal or Toast

## 4. Layout Structure
- Global header and global navigation MUST be first two components
- Content area must start below global navigation
- Account for header height in content layout
- Ensure proper spacing between header and content
- Maintain consistent padding and margins
- Use desktop-optimized grid layouts
- Never overlap components.
- **For dashboard or multi-section layouts, use a two-column grid: place activity feeds and lists on the left, and summary cards, charts, or widgets on the right. Use a flexible layout that adapts to the number and type of components.**
- **If the layout is a grid or two-column, specify this in the JSON structure as a 'layout' property, e.g., { layout: { type: 'grid', columns: 2, areas: [...] } }**

## 5. Component Organization and Quality
- Create small, focused components (< 50 lines)
- Follow atomic design principles
- Ensure proper component hierarchy
- Maintain consistent naming conventions
- Use TypeScript for type safety
- Implement responsive designs by default
- Write extensive console logs for debugging

## 6. Component Variant Selection Guidelines
- Available components and their variants:
${componentGroupsString}

## 7. Error Handling and Feedback
- Provide clear error messages for component failures
- Log detailed information for debugging
- Implement proper error boundaries
- Use toast notifications for user feedback
- Ensure graceful fallbacks for missing components

## 8. User-Centric Design Principles
- Design for clarity and ease of use
- Ensure intuitive navigation and flow
- Create clear visual hierarchies
- Use consistent patterns and behaviors
- Provide clear feedback for user actions
- Minimize cognitive load
- Follow Fitts's Law for interactive elements
- Maintain proper contrast ratios for readability

## 9. Layout and Spacing
- Use consistent spacing (8px, 16px, 24px, 32px)
- Maintain proper alignment and grid structure
- Group related elements together
- Provide adequate white space
- Ensure proper content density
- Use responsive design principles
- Account for header height in content layout (add 64px top margin to main content)
- No Auto Layout for header and navigation. 
- Apply Auto Layout to the page content Only.
- For Page layout, add 16px padding to the left and right of the page content.

## 10. Visual Design
- Create clear visual hierarchy
- Use appropriate typography scale
- Ensure text is readable (minimum 16px for body text)
- Maintain proper contrast ratios
- Use color purposefully and consistently
- Provide visual feedback for interactive elements
- Use icons and imagery appropriately

## 11. Accessibility and Inclusivity
- Ensure sufficient color contrast
- Provide text alternatives for non-text content
- Design for keyboard navigation
- Consider users with different abilities
- Use semantic HTML structure
- Provide clear focus states
- Support screen readers

## 12. Interaction Design
- Make interactive elements obvious
- Provide clear affordances
- Use appropriate hover and active states
- Ensure consistent interaction patterns
- Provide immediate feedback for actions
- Prevent and handle errors gracefully
- Support common user workflows

## 13. Content Strategy
- Use clear, concise language
- Write meaningful labels and instructions
- Provide helpful error messages
- Use progressive disclosure for complex information
- Maintain consistent terminology
- Consider localization needs

## 14. Best Practices
- Always include field labels for inputs
- Pills truncate at 37 characters with ellipsis
- Don't use linked pills inside listboxes
- Scoped notifications are not dismissible
- Multiple expandable sections can be open simultaneously
- Use consistent spacing and alignment
- Follow accessibility guidelines (ARIA attributes)
- Don't detach instances from the design system
- Respect established interaction patterns

## 15. Validation Requirements (MUST)
- Before returning the JSON, validate that:
  - No component (e.g., PageHeader) has more than 3 actions/buttons.
  - No two components have the same visible text label within the same screen.
  - The layout is not cluttered: avoid more than 6 major components per screen, and ensure adequate spacing.
  - There are no duplicate or repeated components.
  - All required properties for each component are present.
- If the design is invalid, return a clear error message and do not generate the design.

## 0. Page Structure (REQUIRED)
- Structure every page using auto layout with the following sections, in order:
  1. Global Header
  2. Global Navigation
  3. Page Content (auto layout frame with up to three columns: Left, Middle, Right)
     - Group related components logically within each column
     - Use Left for navigation/filters, Middle for main content, Right for supporting widgets/cards
  4. Docked Utility Bar or Footer (optional, appears at the bottom and is always visible)
- Each section should be a distinct auto layout frame.
- Ensure clear separation and logical grouping of components within each section.

## Layout Requirements (REQUIRED)
- Do NOT use auto layout for any section or component.
- All frames, groups, and components must use absolute/static positioning.
- Position and size all elements explicitly using x, y, width, and height.
- Do not use Figma's auto layout features anywhere in the design.

## Modal Structure Requirements
- When generating a modal, all input fields, sections, and buttons must be included as children of the modal component in the JSON structure.
- Do NOT place input fields, sections, or buttons as siblings of the modal; they must be nested inside the modal's children array.
- Example:
      {
        "type": "Modal",
        "children": [
          { "type": "Section", "props": { "title": "Basic Information" }, "children": [ ...fields... ] },
          { "type": "Section", "props": { "title": "Contact Details" }, "children": [ ...fields... ] },
          { "type": "Section", "props": { "title": "Account Association" }, "children": [ ...fields... ] },
          { "type": "Button", "props": { "label": "Save" } },
          { "type": "Button", "props": { "label": "Save & New" } },
          { "type": "Button", "props": { "label": "Cancel" } }
        ]
      }

## Example: Account Detail Screen JSON
Here is an example JSON structure for an Account Detail screen:

{
  "screens": [
    {
      "name": "Account Detail - Alphabet, Inc.",
      "id": "account-detail",
      "layout": {
        "width": 1440,
        "x": 0,
        "y": 0
      },
      "children": [
        {
          "type": "Global Header",
          "variant": "Default",
          "id": "global-header",
          "properties": {
            "logo": true,
            "search": true,
            "utilityIcons": ["favorites", "help", "setup", "notifications", "avatar"]
          }
        },
        {
          "type": "Global Navigation",
          "variant": "Default",
          "id": "global-nav",
          "properties": {
            "appName": "Home",
            "tabs": ["Home", "Accounts", "Contacts", "Service", "Sales", "Calendar", "Dashboards", "Reports", "More"],
            "activeTab": "Accounts"
          }
        },
        {
          "type": "Page Header",
          "variant": "Record Home",
          "id": "page-header",
          "properties": {
            "objectIcon": "account",
            "objectType": "Account",
            "recordName": "Alphabet, Inc.",
            "actions": [
              { "label": "Follow", "variant": "neutral", "icon": "add" },
              { "label": "New", "variant": "neutral" },
              { "label": "Edit", "variant": "neutral" },
              { "label": "Delete", "variant": "neutral" },
              { "label": "Clone", "variant": "neutral" }
            ]
          }
        },
        {
          "type": "Progress Indicator",
          "variant": "Path",
          "id": "progress-path",
          "properties": {
            "steps": [
              { "label": "Contacted", "status": "complete" },
              { "label": "Open", "status": "complete" },
              { "label": "Unqualified", "status": "complete" },
              { "label": "Nurturing", "status": "complete" },
              { "label": "Closed", "status": "incomplete" }
            ],
            "currentStep": 4,
            "currentStepLabel": "Status: Working"
          }
        },
        {
          "type": "Button",
          "variant": "Brand",
          "id": "mark-complete-btn",
          "properties": {
            "label": "Mark Stage as Complete",
            "position": "right"
          },
          "layout": {
            "x": 1200,
            "y": 320
          }
        },
        {
          "type": "Card",
          "variant": "Base",
          "id": "page-layout-container",
          "layout": {
            "width": 1440,
            "height": "auto",
            "x": 0,
            "y": 400
          },
          "children": [
            {
              "type": "Tabs",
              "variant": "Scoped",
              "id": "main-tabs",
              "properties": {
                "tabs": ["Related", "Details", "News", "Activity"],
                "activeTab": "Related"
              },
              "children": [
                {
                  "type": "Grid",
                  "variant": "Two Column",
                  "id": "content-grid",
                  "children": [
                    {
                      "type": "Column",
                      "id": "left-column",
                      "layout": {
                        "width": "66%"
                      },
                      "children": [
                        {
                          "type": "Expandable Section",
                          "variant": "Default",
                          "id": "about-section",
                          "properties": {
                            "title": "About",
                            "isOpen": true
                          },
                          "children": [
                            {
                              "type": "Record Detail",
                              "variant": "View",
                              "id": "about-details",
                              "properties": {
                                "fields": [
                                  { "label": "Name", "value": "Alphabet, Inc", "type": "text", "required": true },
                                  { "label": "Website", "value": "", "type": "url", "editable": true },
                                  { "label": "Type", "value": "", "type": "picklist", "editable": true },
                                  { "label": "Description", "value": "", "type": "textarea", "editable": true },
                                  { "label": "Parent Account", "value": "", "type": "lookup", "editable": true },
                                  { "label": "Account Currency", "value": "USD - U.S. Dollar", "type": "picklist", "editable": true }
                                ]
                              }
                            }
                          ]
                        },
                        {
                          "type": "Expandable Section",
                          "variant": "Default",
                          "id": "contact-section",
                          "properties": {
                            "title": "Get in Touch",
                            "isOpen": true
                          },
                          "children": [
                            {
                              "type": "Record Detail",
                              "variant": "View",
                              "id": "contact-details",
                              "properties": {
                                "fields": [
                                  { "label": "Phone Number", "value": "", "type": "phone", "editable": true },
                                  { "label": "Billing Address", "value": "", "type": "address", "editable": true },
                                  { "label": "Shipping Address", "value": "", "type": "address", "editable": true }
                                ]
                              }
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "type": "Column",
                      "id": "right-column",
                      "layout": {
                        "width": "34%"
                      },
                      "children": [
                        {
                          "type": "Card",
                          "variant": "Base",
                          "id": "guidance-card",
                          "properties": {
                            "title": "Guidance for Success"
                          },
                          "children": [
                            {
                              "type": "Rich Text",
                              "variant": "Default",
                              "id": "guidance-content",
                              "properties": {
                                "content": "• What problems do they want to solve and what are they hoping to improve?\n• Why are they looking now and where are they in the buying cycle?\n• What's their budget?\n• What other solutions are they considering?"
                              }
                            }
                          ]
                        },
                        {
                          "type": "Button Group",
                          "variant": "Base",
                          "id": "action-buttons",
                          "properties": {
                            "buttons": [
                              { "label": "Log a Call", "icon": "log_a_call", "variant": "neutral" },
                              { "label": "Email", "icon": "email", "variant": "neutral" },
                              { "label": "New Event", "icon": "event", "variant": "neutral" }
                            ]
                          }
                        },
                        {
                          "type": "Checkbox",
                          "variant": "Toggle",
                          "id": "activity-filter",
                          "properties": {
                            "label": "Only show activities with insights",
                            "checked": true
                          }
                        },
                        {
                          "type": "Activity Timeline",
                          "variant": "Default",
                          "id": "activity-timeline",
                          "properties": {
                            "title": "Upcoming and Overdue",
                            "expandable": true,
                            "items": [
                              {
                                "type": "email",
                                "subject": "Re: Mobile conversation on Monday with the global team",
                                "description": "You emailed Name",
                                "timestamp": "9:00am | 3/20/24",
                                "overdue": false
                              },
                              {
                                "type": "email",
                                "subject": "Re: Mobile conversation on Monday with the global team",
                                "description": "You emailed Name",
                                "timestamp": "9:00am | 3/20/24",
                                "overdue": false
                              }
                            ],
                            "filters": "All time • All Activities • Logged calls, Email, Events, List email, and Tasks"
                          }
                        },
                        {
                          "type": "Button",
                          "variant": "Link",
                          "id": "refresh-link",
                          "properties": {
                            "label": "Refresh"
                          }
                        },
                        {
                          "type": "Button",
                          "variant": "Link",
                          "id": "expand-all-link",
                          "properties": {
                            "label": "Expand All"
                          }
                        },
                        {
                          "type": "Button",
                          "variant": "Link",
                          "id": "view-all-link",
                          "properties": {
                            "label": "View All"
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "Related List Container",
          "variant": "Default",
          "id": "related-lists",
          "layout": {
            "y": 1200
          },
          "children": [
            {
              "type": "Related List",
              "variant": "Base",
              "id": "contacts-list",
              "properties": {
                "icon": "contact",
                "title": "Contacts",
                "count": 3,
                "columns": ["Name", "Title", "Email", "Phone"],
                "actions": ["New"],
                "expandable": true,
                "items": [
                  { "Name": "Kristen Jones", "Title": "VP of Sales", "Role": "Decision Maker" },
                  { "Name": "Kristen Jones", "Title": "VP of Sales", "Role": "Decision Maker" },
                  { "Name": "Lauren Bailey", "Title": "VP of Sales", "Role": "Decision Maker" },
                  { "Name": "Steve Handler", "Title": "VP of Sales", "Role": "Decision Maker" }
                ]
              }
            },
            {
              "type": "Related List",
              "variant": "Base",
              "id": "opportunities-list",
              "properties": {
                "icon": "opportunity",
                "title": "Opportunities",
                "count": 0,
                "expandable": true,
                "emptyState": true
              }
            },
            {
              "type": "Related List",
              "variant": "Base",
              "id": "cases-list",
              "properties": {
                "icon": "case",
                "title": "Cases",
                "count": 0,
                "expandable": true,
                "emptyState": true
              }
            },
            {
              "type": "Related List",
              "variant": "Base",
              "id": "files-list",
              "properties": {
                "icon": "file",
                "title": "Files",
                "count": 0,
                "expandable": true,
                "emptyState": true,
                "actions": ["Upload Image"]
              }
            }
          ]
        }
      ]
    }
  ]
}

Return a well-structured design that follows these principles and provides an exceptional user experience. Each design MUST include the global header as specified above, and component variants MUST be chosen according to their intended purpose and context.`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('HTTP error! Status: ' + response.status + ' - ' + response.statusText + '\n' + errorText);
    }

    const data = await response.json();
    console.log('Successfully received design from AI:', data);
    return data;
  } catch (error) {
    console.error('Error fetching design from AI:', error);
    figma.notify('Error connecting to the design server. Please ensure the server is running at http://localhost:3000', { error: true });
    return null;
  }
}

// Fetch components from all selected libraries (no cache)
async function getFigmaComponentsByIds(libraryIds: string[]): Promise<any[]> {
  const fileKeys = libraryIds
    .map(id => {
      const config = LIBRARY_CONFIG[id as LibraryId];
      return config && config.fileKey;
    })
    .filter(Boolean)
    .join(',');

  if (!fileKeys) {
    console.error('No valid fileKeys found for selected libraries:', libraryIds);
    return [];
  }

  try {
    reportProgress('fetching', 'Fetching components from Figma...');
    const response = await fetch(`http://localhost:3000/components?fileKeys=${fileKeys}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}\n${errorText}`);
    }
    const components = await response.json() as any[];
    return components;
  } catch (error) {
    console.error("Error fetching Figma components:", error);
    return [];
  }
}

function findMatchingComponent(components: any[], type: string, variant?: string): any {
  const normalizedType = type.toLowerCase().trim();

  // Find all components matching the type
  const matchingTypeComponents = components.filter(comp => {
    const compType = (comp.containing_frame && (comp.containing_frame.name || comp.containing_frame.pageName) || '').toLowerCase().trim();
    return compType === normalizedType || compType.includes(normalizedType);
  });

  if (matchingTypeComponents.length === 0) {
    console.log('No components found matching type:', normalizedType);
    return null;
  }

  // Just return the first available component of the type, ignore variant
  return matchingTypeComponents[0];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function safelyResizeNode(
  node: SceneNode,
  width: number | undefined,
  height: number | undefined
): void {
  const currentWidth = "width" in node ? node.width : 100;
  const currentHeight = "height" in node ? node.height : 40;

  // Ensure minimum dimensions for usability
  const minWidth = 40;
  const minHeight = 40;

  const newWidth = width && width > minWidth ? width : Math.max(currentWidth, minWidth);
  const newHeight = height && height > minHeight ? height : Math.max(currentHeight, minHeight);

  if (newWidth > 0 && newHeight > 0 && "resize" in node) {
    node.resize(newWidth, newHeight);
  }
}

// Simplify applyConsistentSpacing to focus on essential layout
function applyConsistentSpacing(container: FrameNode, children: SceneNode[]): void {
  const spacing = 16; // Base spacing unit
  const padding = 24; // Container padding
  const maxHeight = 1024; // Maximum container height
  let currentY = padding;
  let maxRowHeight = 0;

  // Position components vertically
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    
    // Position child
    child.x = padding;
    child.y = currentY;

    // Update tracking variables
    currentY += child.height + spacing;
    maxRowHeight = Math.max(maxRowHeight, child.height);
  }

  // Update container height to fit all content with padding, but not exceed maxHeight
  const totalHeight = Math.min(currentY + maxRowHeight + padding, maxHeight);
  container.resize(container.width, totalHeight);
}

async function renderComponents(userPrompt: string, libraryIds: string[]) {
  try {
    reportProgress('analyzing', 'Analyzing your prompt...');
    const components = await getFigmaComponentsByIds(libraryIds);
    if (!components || components.length === 0) {
      figma.notify(`No components found in the selected libraries`, { error: true });
      figma.ui.postMessage({ type: "complete", success: false });
      return;
    }

    if (shouldStop) {
      throw new Error('Generation stopped');
    }

    const firstLibraryId = libraryIds[0] as LibraryId || 'core';
    reportProgress('generating', 'Generating design...');
    const designData = await getLLMResponse(components, userPrompt, LIBRARY_CONFIG[firstLibraryId]);
    
    if (shouldStop) {
      throw new Error('Generation stopped');
    }

    if (!designData || !Array.isArray(designData.screens)) {
      figma.notify("Failed to get valid design data from LLM", { error: true });
      figma.ui.postMessage({ type: "complete", success: false });
      return;
    }

    // Enforce Global Header and Global Navigation width to 1440
    if (designData && Array.isArray(designData.screens)) {
      designData.screens.forEach((screen: any) => {
        if (Array.isArray(screen.children)) {
          screen.children.forEach((child: any) => {
            if (
              (child.type && child.type.toLowerCase().includes('global header')) ||
              (child.type && child.type.toLowerCase().includes('global navigation'))
            ) {
              if (!child.layout) child.layout = {};
              child.layout.width = 1440;
            }
          });
        }
      });
    }

    const previewText = 'I\'ll create ' + designData.screens.length + ' screen' + (designData.screens.length > 1 ? 's' : '') + ':\n\n' +
      designData.screens.map(function(screen: any) {
        var screenName = screen.name || screen.id;
        var width = (screen.layout && screen.layout.width) || 1200;
        var componentCount = (screen.children && screen.children.length) || 0;
        var components = screen.children ? screen.children.map(function(child: any) {
          return '  - ' + child.type + (child.variant ? ' (' + child.variant + ')' : '');
        }).join('\n') : '';
        return '📱 ' + screenName + '\n' +
               '   Components: ' + componentCount + '\n' +
               (components ? '   Components List:\n' + components : '');
      }).join('\n\n');
    
    figma.ui.postMessage({ 
      type: "preview", 
      preview: previewText 
    });

    const successfulComponents: string[] = [];
    const failedComponents: string[] = [];

    // Pre-load common fonts
    const commonFonts = [
      { family: "Inter", style: "Regular" },
      { family: "Inter", style: "Medium" },
      { family: "Inter", style: "Bold" },
      { family: "SF Pro Text", style: "Regular" }
    ];

    try {
      await Promise.all(commonFonts.map(font => 
        figma.loadFontAsync(font).catch(error => {
          console.warn('Failed to load font ' + font.family + ' ' + font.style + ':', error);
          return null;
        })
      ));
    } catch (error) {
      console.warn('Error pre-loading fonts:', error);
    }

    // Process screens sequentially
    for (let i = 0; i < designData.screens.length; i++) {
      const screen = designData.screens[i];
      if (shouldStop) {
        throw new Error('Generation stopped');
      }
      reportProgress('rendering', 'Rendering screen ' + (i + 1) + ' of ' + designData.screens.length + '...');

      // --- Layout logic ---
      // If screen.layout.type === 'grid' or columns === 2, use two-column layout
      let useGrid = false;
      let gridColumns = 1;
      let gridAreas: any[] = [];
      if (screen.layout && screen.layout.type === 'grid' && screen.layout.columns === 2 && Array.isArray(screen.layout.areas)) {
        useGrid = true;
        gridColumns = 2;
        gridAreas = screen.layout.areas;
      }

      const container = figma.createFrame();
      container.name = screen.name || screen.id || "Generated Screen";
      let width = 1200;
      let x = 0;
      let y = 0;
      if (screen.layout) {
        if (typeof screen.layout.width === 'number') width = screen.layout.width;
        if (typeof screen.layout.x === 'number') x = screen.layout.x;
        if (typeof screen.layout.y === 'number') y = screen.layout.y;
      }
      container.x = x;
      container.y = y;
      container.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      container.resize(width, 100); // Initial height, will be resized

      const renderedChildren: SceneNode[] = [];
      const children = screen.children || [];

      // --- Limit page header actions/buttons to 3 ---
      // If a PageHeader is present, limit its actions property
      for (let child of children) {
        if (child.type && child.type.toLowerCase() === 'pageheader' && child.properties && Array.isArray(child.properties.actions)) {
          child.properties.actions = child.properties.actions.slice(0, 3);
        }
      }

      if (useGrid) {
        // --- Two-column/grid layout ---
        // Create two columns as frames
        const leftCol = figma.createFrame();
        leftCol.name = "Left Column";
        leftCol.resize(width / 2 - 16, 100);

        const rightCol = figma.createFrame();
        rightCol.name = "Right Column";
        rightCol.resize(width / 2 - 16, 100);

        // Place components in columns based on gridAreas
        for (let area of gridAreas) {
          const col = area.column;
          const areaComponents = area.components || [];
          for (let child of areaComponents) {
            // Render as in the original logic (reuse existing rendering code)
            // ...
            // For brevity, call a helper function to render and append
            await renderAndAppendComponent(child, components, col === 1 ? leftCol : rightCol, renderedChildren, successfulComponents, failedComponents);
          }
        }
        // Resize columns to fit content
        leftCol.resize(leftCol.width, leftCol.children.reduce((h, c) => h + c.height + leftCol.itemSpacing, 0) + leftCol.paddingTop + leftCol.paddingBottom);
        rightCol.resize(rightCol.width, rightCol.children.reduce((h, c) => h + c.height + rightCol.itemSpacing, 0) + rightCol.paddingTop + rightCol.paddingBottom);
        container.appendChild(leftCol);
        container.appendChild(rightCol);
        renderedChildren.push(leftCol, rightCol);
      } else {
        // --- Single column/vertical layout ---
        // Render children as before
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          await renderAndAppendComponent(child, components, container, renderedChildren, successfulComponents, failedComponents);
        }
      }

      // --- Dynamically resize container to fit all children ---
      // Find the bottom-most child
      let totalHeight = 0;
      if (useGrid) {
        totalHeight = Math.max(
          ...container.children.map((col: any) => col.y + col.height)
        ) + container.paddingBottom;
      } else {
        totalHeight = renderedChildren.reduce((h, c) => h + c.height + container.itemSpacing, 0) + container.paddingTop + container.paddingBottom;
      }
      container.resize(width, Math.max(totalHeight, 100));
      figma.currentPage.appendChild(container);
    }

    if (failedComponents.length === 0) {
      figma.notify("Successfully generated all components!");
    } else {
      figma.notify(
        'Generated ' + successfulComponents.length + ' components. Failed: ' + [
          ...new Set(failedComponents),
        ].join(", ")
      );
    }

    // Debug: log what is being sent to the UI
    console.log('Sending to UI:', {
      type: "complete",
      success: true,
      stats: {
        successful: successfulComponents.length,
        failed: failedComponents.length,
      },
      designJson: designData
    });

    figma.ui.postMessage({
      type: "complete",
      success: true,
      stats: {
        successful: successfulComponents.length,
        failed: failedComponents.length,
      },
      designJson: designData
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Generation stopped') {
      console.log('Generation was stopped by user');
    } else {
      console.error("Error in renderComponents:", error);
      figma.notify("Error generating design: " + getErrorMessage(error), {
        error: true,
      });
    }
    figma.ui.postMessage({ type: "complete", success: false });
  }
}

// Helper function to render and append a component to a parent frame
async function renderAndAppendComponent(child: any, components: any[], parent: FrameNode, renderedChildren: SceneNode[], successfulComponents: string[], failedComponents: string[]) {
  if (!child.type) {
    console.warn('Skipping component missing type:', child);
    return;
  }
  try {
    const matchingComponent = findMatchingComponent(
      components,
      child.type,
      child.variant
    );
    if (!matchingComponent) {
      failedComponents.push(child.type + (child.variant ? ' (' + child.variant + ')' : ''));
      return;
    }
    if (matchingComponent.isText) {
      if (!child.properties || typeof child.properties.text !== 'string') {
        console.warn('Text component missing text property:', child);
        failedComponents.push(child.type);
        return;
      }
      const textNode = figma.createText();
      try {
        textNode.fontName = { family: "Inter", style: "Regular" };
        await figma.loadFontAsync(textNode.fontName);
      } catch (error) {
        try {
          textNode.fontName = { family: "SF Pro Text", style: "Regular" };
          await figma.loadFontAsync(textNode.fontName);
        } catch (fallbackError) {}
      }
      let textContent = child.properties.text;
      textNode.characters = textContent;
      if (child.properties.fontSize) {
        textNode.fontSize = child.properties.fontSize;
      }
      if (child.properties.textAlign) {
        textNode.textAlignHorizontal = child.properties.textAlign;
      }
      // Hug contents for width and height
      textNode.textAutoResize = "WIDTH_AND_HEIGHT";
      parent.appendChild(textNode);
      renderedChildren.push(textNode);
      successfulComponents.push(child.type);
      return;
    }
    if (!matchingComponent.key) {
      failedComponents.push(child.type + (child.variant ? ' (' + child.variant + ')' : ''));
      return;
    }
    try {
      const component = await figma.importComponentByKeyAsync(matchingComponent.key);
      const instance = component.createInstance();
      instance.name = child.id || (child.type + (child.variant ? ' (' + child.variant + ')' : ''));
      if (child.variant) {
        try {
          const mainComponent = await instance.getMainComponentAsync();
          if (mainComponent && mainComponent.children) {
            const variantFormats = [
              child.variant,
              child.variant.replace('State=', ''),
              child.variant.toLowerCase(),
              child.variant.toUpperCase(),
              child.variant.replace(/\s+/g, ''),
              child.variant.replace(/\s+/g, '-'),
              child.variant.replace(/\s+/g, '_')
            ];
            let matchingVariant = null;
            for (const format of variantFormats) {
              matchingVariant = mainComponent.children.find(
                (c: SceneNode) => c.name.toLowerCase() === format.toLowerCase()
              );
              if (matchingVariant) break;
            }
            if (matchingVariant) {
              instance.mainComponent = matchingVariant as ComponentNode;
            } else {
              const defaultVariant = mainComponent.children.find(
                (c: SceneNode) => 
                  c.name.toLowerCase().includes('default') || 
                  c.name.toLowerCase().includes('normal')
              );
              if (defaultVariant) {
                instance.mainComponent = defaultVariant as ComponentNode;
              }
            }
          }
        } catch (variantError) {}
      }
      if (child.layout) {
        if (typeof child.layout.x === 'number') instance.x = child.layout.x;
        if (typeof child.layout.y === 'number') instance.y = child.layout.y;
        if (typeof child.layout.width === 'number' && typeof child.layout.height === 'number') {
          safelyResizeNode(instance, child.layout.width, child.layout.height);
        }
      }
      if (child.properties) {
        if (typeof child.properties.text === "string") {
          const textNodes = instance.findAll((node) => node.type === "TEXT");
          for (const node of textNodes) {
            const textNode = node as TextNode;
            try {
              await figma.loadFontAsync(textNode.fontName as FontName);
              textNode.characters = child.properties.text;
            } catch (fontError) {
              try {
                textNode.fontName = { family: "Inter", style: "Regular" };
                await figma.loadFontAsync(textNode.fontName);
                textNode.characters = child.properties.text;
              } catch (fallbackError) {}
            }
            // Hug contents for width and height
            textNode.textAutoResize = "WIDTH_AND_HEIGHT";
          }
        }
        if (child.properties.fill) {
          const fills = instance.findAll((node) => "fills" in node);
          for (const node of fills) {
            (node as GeometryMixin).fills = [{ type: 'SOLID', color: child.properties.fill }];
          }
        }
      }
      // Set height to hug contents for the instance if possible
      if ("primaryAxisSizingMode" in instance) {
        try {
          instance.primaryAxisSizingMode = "AUTO";
        } catch (e) {}
      }
      parent.appendChild(instance);
      renderedChildren.push(instance);
      successfulComponents.push(child.type);
    } catch (error) {
      failedComponents.push(child.type + (child.variant ? ' (' + child.variant + ')' : ''));
    }
  } catch (error) {
    failedComponents.push(child.type + (child.variant ? ' (' + child.variant + ')' : ''));
  }
}

// Add a function to report progress
function reportProgress(stage: string, message: string) {
  figma.ui.postMessage({
    type: "progress",
    stage,
    message
  });
}
