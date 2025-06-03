/* eslint-disable @typescript-eslint/no-explicit-any */

figma.showUI(__html__, { width: 450, height: 700 });

let isGenerating = false;
let shouldStop = false;

// Define library types
type LibraryId = 'slds' | 'libA' | 'libB';

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
    name: "slds Components",
    fileKey: "RiY2reCmbX0Jyq7QAFL8SE",
  }, // Using same key for now as requested
  libA: {
    name: "web Components",
    fileKey: "uuzKZvAxmOWZSDuZjkAfmQ", // Using same key for now as requested
  },
  libB: {
    name: "slds Components",
    fileKey: "E1qeg6cS93K9Lm8c5AMSod", // Using same key for now as requested
  }
};

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate") {
    if (isGenerating) {
      figma.notify("Already generating a design. Please wait or stop the current generation.", { error: true });
      return;
    }

    // Always use all libraries
    const libraryIds: LibraryId[] = ['slds', 'libA', 'libB'];
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
        systemPrompt: `You are a UI/UX design expert creating high-quality, professional designs with exceptional customer experience using the ${
          libraryConfig.name
        } library. Follow these guidelines:

1. Design Focus (PRIMARY REQUIREMENT):
   - Generate desktop-first designs by default
   - Target desktop screen sizes (width = 1440px)
   - Use desktop-optimized layouts and components
   - Consider mobile responsiveness as a secondary requirement
   - add 64px margin between two generated frames.

2. Global Header Requirements (MUST BE INCLUDED IN EVERY PAGE):
   - Every screen MUST include a global header and global navigation at the top and there should not be any padding above that. 
   - global header and global navigation must be the first two components in the layout
   - global header and global navigation must span the full width of the screen
   - global header and global navigation must be visible at all times (sticky positioning)
   - Use the Global Navigation of any first variant available in the library
   - The Global Navigation component should be used with its default variant unless specified otherwise

   Mobile Considerations (Secondary):
   * For mobile screens (width < 768px):
     - Adapt desktop header to vertical layout
     - Stack navigation items vertically
     - Use hamburger menu for additional options

3. Layout Structure:
   - global header and global navigation MUST be the first two component
   - Content area must start below the global navigation
   - Account for header height in content layout 
   - Ensure proper spacing between header and content
   - Maintain consistent padding and margins
   - Use desktop-optimized grid layouts
   - render components in a single column layout by default
   - Consider multi-column layouts where appropriate

4. Component Organization and Quality:
   - Create small, focused components (< 50 lines)
   - Follow atomic design principles
   - Ensure proper component hierarchy
   - Maintain consistent naming conventions
   - Use TypeScript for type safety
   - Implement responsive designs by default
   - Write extensive console logs for debugging

5. Component Variant Selection Guidelines:
   - Choose variants based on component purpose and context:
     * Buttons:
       - Use "Primary" for main actions (submit, save, confirm)
       - Use "Secondary" for alternative actions (cancel, back)
       - Use "Error" only for destructive actions (delete, remove)
       - Use "Success" for completed actions
       - Use "Disabled" for unavailable actions
     * Input Fields:
       - Use "Default" for normal input
       - Use "Error" only when validation fails
       - Use "Success" when validation passes
       - Use "Disabled" for read-only fields
     * Navigation:
       - Use "Active" for current page/selection
       - Use "Hover" for interactive states
       - Use "Default" for normal state
     * Alerts/Notifications:
       - Use "Error" for critical issues
       - Use "Warning" for important notices
       - Use "Success" for positive feedback
       - Use "Info" for general information
   - Available components and their variants:
   ${Object.entries(componentGroups)
     .map(
       ([type, variants]) =>
         `- ${type}:\n${variants.map((v) => `  * ${v}`).join("\n")}`
     )
     .join("\n")}

6. Error Handling and Feedback:
   - Provide clear error messages for component failures
   - Log detailed information for debugging
   - Implement proper error boundaries
   - Use toast notifications for user feedback
   - Ensure graceful fallbacks for missing components

7. Documentation and Guidelines:
   - Document complex component interactions
   - Keep component usage instructions clear
   - Include setup and configuration guidelines
   - Document API endpoints and data structures
   - Maintain consistent terminology

8. User-Centric Design Principles:
   - Design for clarity and ease of use
   - Ensure intuitive navigation and flow
   - Create clear visual hierarchies
   - Use consistent patterns and behaviors
   - Provide clear feedback for user actions
   - Minimize cognitive load
   - Follow Fitts's Law for interactive elements
   - Maintain proper contrast ratios for readability

9. Component Selection and Usage:
   - Use ONLY these available components and their variants
   - Choose components that best match the user's mental model
   - Ensure components are used consistently throughout the design
   - For text content, use the type "Textarea" with appropriate sizing

10. Layout and Spacing:
   - Use consistent spacing (8px, 16px, 24px, 32px)
   - Maintain proper alignment and grid structure
   - Group related elements together
   - Provide adequate white space
   - Ensure proper content density
   - Use responsive design principles
   - Consider mobile-first approach
   - Account for header height in content layout (add 64px top margin to main content)

11. Visual Design:
   - Create clear visual hierarchy
   - Use appropriate typography scale
   - Ensure text is readable (minimum 16px for body text)
   - Maintain proper contrast ratios
   - Use color purposefully and consistently
   - Provide visual feedback for interactive elements
   - Use icons and imagery appropriately

12. Accessibility and Inclusivity:
   - Ensure sufficient color contrast
   - Provide text alternatives for non-text content
   - Design for keyboard navigation
   - Consider users with different abilities
   - Use semantic HTML structure
   - Provide clear focus states
   - Support screen readers

13. Interaction Design:
   - Make interactive elements obvious
   - Provide clear affordances
   - Use appropriate hover and active states
   - Ensure consistent interaction patterns
   - Provide immediate feedback for actions
   - Prevent and handle errors gracefully
   - Support common user workflows

14. Content Strategy:
   - Use clear, concise language
   - Write meaningful labels and instructions
   - Provide helpful error messages
   - Use progressive disclosure for complex information
   - Maintain consistent terminology
   - Consider localization needs

Return a well-structured design that follows these principles and provides an exceptional user experience. Each design MUST include the global header as specified above, and component variants MUST be chosen according to their intended purpose and context.`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server response error:", {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log("Successfully received design from AI:", data);
    return data;
  } catch (error) {
    console.error("Error fetching design from AI:", error);
    figma.notify("Error connecting to the design server. Please ensure the server is running at http://localhost:3000", { error: true });
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
  const normalizedVariant = variant ? variant.toLowerCase().trim() : undefined;

  console.log(`Looking for component: type="${type}", variant="${variant}"`);
  console.log(`Normalized: type="${normalizedType}", variant="${normalizedVariant}"`);

  // First, try to find components that match the type
  const matchingTypeComponents = components.filter(comp => {
    const compType = (comp.containing_frame && (comp.containing_frame.name || comp.containing_frame.pageName) || '').toLowerCase().trim();
    return compType === normalizedType || compType.includes(normalizedType);
  });

  if (matchingTypeComponents.length === 0) {
    console.log('No components found matching type:', normalizedType);
    return null;
  }

  console.log(`Found ${matchingTypeComponents.length} components matching type`);

  // If no variant specified, return the first matching component
  if (!normalizedVariant) {
    console.log('No variant specified, using first matching component');
    return matchingTypeComponents[0];
  }

  // Try to find exact variant match
  let match = matchingTypeComponents.find(comp => {
    const compVariant = (comp.name || '').toLowerCase().trim();
    return compVariant === normalizedVariant;
  });

  // If no exact match, try fuzzy match
  if (!match) {
    console.log('No exact variant match, trying fuzzy match...');
    match = matchingTypeComponents.find(comp => {
      const compVariant = (comp.name || '').toLowerCase().trim();
      return compVariant.includes(comp.name);
    });
  }

  // If still no match, return the first component of that type
  if (!match) {
    console.log('No variant match found, using first available component of type');
    return matchingTypeComponents[0];
  }

  console.log('Found matching component:', match);
  return match;
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

    const previewText = `I'll create ${designData.screens.length} screen${designData.screens.length > 1 ? 's' : ''}:\n\n` +
      designData.screens.map((screen: { name?: string; id: string; layout?: any; children?: any[] }) => {
        const screenName = screen.name || screen.id;
        const width = (screen.layout && screen.layout.width) || 1200;
        const componentCount = (screen.children && screen.children.length) || 0;
        const components = screen.children ? screen.children.map(child => `  - ${child.type}${child.variant ? ` (${child.variant})` : ''}`).join('\n') : '';
        
        return `📱 ${screenName}\n` +
               `   Components: ${componentCount}\n` +
               (components ? `   Components List:\n${components}` : '');
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
          console.warn(`Failed to load font ${font.family} ${font.style}:`, error);
          return null;
        })
      ));
    } catch (error) {
      console.warn('Error pre-loading fonts:', error);
    }

    // Process screens sequentially
    for (let i = 0; i < designData.screens.length; i++) {
      const screen = designData.screens[i];
      
      // Check if stopped
      if (shouldStop) {
        throw new Error('Generation stopped');
      }

      // Report progress for current screen
      reportProgress('rendering', `Rendering screen ${i + 1} of ${designData.screens.length}...`);

      const container = figma.createFrame();
      container.name = screen.name || screen.id || "Generated Screen";

      // Set default container width if not specified
      let width = 1200;
      let x = 0;
      let y = 0;

      if (screen.layout) {
        if (typeof screen.layout.width === 'number') width = screen.layout.width;
        if (typeof screen.layout.x === 'number') x = screen.layout.x;
        if (typeof screen.layout.y === 'number') y = screen.layout.y;
      }

      // Set initial height to minimum height
      container.resize(width, 1024); // Set fixed height of 1024px
      container.x = x;
      container.y = y;

      // Set background color
      container.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      container.layoutMode = "VERTICAL";
      container.primaryAxisSizingMode = "AUTO";
      container.counterAxisSizingMode = "FIXED";
      container.paddingLeft = 0;
      container.paddingRight = 24;
      container.paddingTop = 0;
      container.paddingBottom = 24;
      container.itemSpacing = 16;
      container.minHeight = 1024; // Ensure minimum height
      container.maxHeight = 1024; // Restrict maximum height

      const renderedChildren: SceneNode[] = [];

      // Process children sequentially
      const children = screen.children || [];
      
      // First, render header and navigation if they exist
      for (let i = 0; i < Math.min(2, children.length); i++) {
        const child = children[i];
        if (!child.type) {
          console.warn(`Skipping component missing type:`, child);
          continue;
        }

        try {
          const matchingComponent = findMatchingComponent(
            components,
            child.type,
            child.variant
          );

          if (!matchingComponent) {
            failedComponents.push(`${child.type}${child.variant ? ` (${child.variant})` : ''}`);
            continue;
          }

          if (matchingComponent.isText) {
            // Handle text component
            if (!child.properties || typeof child.properties.text !== 'string') {
              console.warn(`Text component missing text property:`, child);
              failedComponents.push(`${child.type}`);
              continue;
            }

            const textNode = figma.createText();
            
            // Try to load font with fallback
            try {
              textNode.fontName = { family: "Inter", style: "Regular" };
              await figma.loadFontAsync(textNode.fontName);
            } catch (error) {
              console.warn('Failed to load Inter font, trying SF Pro Text:', error);
              try {
                textNode.fontName = { family: "SF Pro Text", style: "Regular" };
                await figma.loadFontAsync(textNode.fontName);
              } catch (fallbackError) {
                console.warn('Failed to load fallback font:', fallbackError);
              }
            }
            
            let textContent = child.properties.text;
            
            textNode.characters = textContent;
            
            if (child.properties.fontSize) {
              textNode.fontSize = child.properties.fontSize;
            }
            if (child.properties.textAlign) {
              textNode.textAlignHorizontal = child.properties.textAlign;
            }
            
            textNode.textAutoResize = "HEIGHT";
            
            const maxTextWidth = container.width - 48;
            const initialWidth = child.layout && typeof child.layout.width === 'number'
              ? Math.min(child.layout.width, maxTextWidth)
              : maxTextWidth;
            
            textNode.resize(initialWidth, textNode.height);

            container.appendChild(textNode);
            renderedChildren.push(textNode);
            successfulComponents.push(`${child.type}`);
            continue;
          }

          if (!matchingComponent.key) {
            console.error(`Component missing key: ${child.type}${child.variant ? ` (${child.variant})` : ''}`);
            failedComponents.push(`${child.type}${child.variant ? ` (${child.variant})` : ''}`);
            continue;
          }

          try {
            const component = await figma.importComponentByKeyAsync(matchingComponent.key);
            const instance = component.createInstance();
            instance.name = child.id || `${child.type}${child.variant ? ` (${child.variant})` : ''}`;

            // Handle variant properties
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
                      (child: SceneNode) => child.name.toLowerCase() === format.toLowerCase()
                    );
                    if (matchingVariant) break;
                  }

                  if (matchingVariant) {
                    instance.mainComponent = matchingVariant as ComponentNode;
                  } else {
                    const defaultVariant = mainComponent.children.find(
                      (child: SceneNode) => 
                        child.name.toLowerCase().includes('default') || 
                        child.name.toLowerCase().includes('normal')
                    );
                    
                    if (defaultVariant) {
                      instance.mainComponent = defaultVariant as ComponentNode;
                    }
                  }
                }
              } catch (variantError) {
                console.error(`Variant error for ${child.type} (${child.variant}):`, variantError);
              }
            }

            // Set layout
            if (child.layout) {
              if (typeof child.layout.x === 'number') instance.x = child.layout.x;
              if (typeof child.layout.y === 'number') instance.y = child.layout.y;
              
              if (typeof child.layout.width === 'number' && typeof child.layout.height === 'number') {
                safelyResizeNode(instance, child.layout.width, child.layout.height);
              }
            }

            // Handle component properties
            if (child.properties) {
              if (typeof child.properties.text === "string") {
                const textNodes = instance.findAll((node) => node.type === "TEXT");
                for (const node of textNodes) {
                  const textNode = node as TextNode;
                  try {
                    await figma.loadFontAsync(textNode.fontName as FontName);
                    textNode.characters = child.properties.text;
                  } catch (fontError) {
                    console.warn(`Failed to load font for text node:`, fontError);
                    try {
                      textNode.fontName = { family: "Inter", style: "Regular" };
                      await figma.loadFontAsync(textNode.fontName);
                      textNode.characters = child.properties.text;
                    } catch (fallbackError) {
                      console.warn(`Failed to load fallback font:`, fallbackError);
                    }
                  }
                }
              }
              
              if (child.properties.fill) {
                const fills = instance.findAll((node) => "fills" in node);
                for (const node of fills) {
                  (node as GeometryMixin).fills = [{ type: 'SOLID', color: child.properties.fill }];
                }
              }
            }

            container.appendChild(instance);
            renderedChildren.push(instance);
            successfulComponents.push(`${child.type}${child.variant ? ` (${child.variant})` : ''}`);
          } catch (error) {
            console.error(`Error rendering ${child.type}${child.variant ? ` (${child.variant})` : ''}:`, error);
            failedComponents.push(`${child.type}${child.variant ? ` (${child.variant})` : ''}`);
          }
        } catch (error) {
          console.error(`Error rendering ${child.type}${child.variant ? ` (${child.variant})` : ''}:`, error);
          failedComponents.push(`${child.type}${child.variant ? ` (${child.variant})` : ''}`);
        }
      }

      // Create a new frame for remaining components with padding
      if (children.length > 2) {
        const contentFrame = figma.createFrame();
        contentFrame.name = "Content Area";
        contentFrame.layoutMode = "VERTICAL";
        contentFrame.primaryAxisSizingMode = "AUTO";
        contentFrame.counterAxisSizingMode = "FIXED";
        contentFrame.resize(container.width, 600); // Set width to match container and minimum height
        contentFrame.paddingLeft = 24;
        contentFrame.paddingRight = 24;
        contentFrame.paddingTop = 0;
        contentFrame.paddingBottom = 24;
        contentFrame.itemSpacing = 16;
        contentFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        contentFrame.minHeight = 600; // Ensure minimum height

        // Render remaining components in the content frame
        for (let i = 2; i < children.length; i++) {
          const child = children[i];
          if (!child.type) {
            console.warn(`Skipping component missing type:`, child);
            continue;
          }

          try {
            const matchingComponent = findMatchingComponent(
              components,
              child.type,
              child.variant
            );

            if (!matchingComponent) {
              failedComponents.push(`${child.type}${child.variant ? ` (${child.variant})` : ''}`);
              continue;
            }

            if (matchingComponent.isText) {
              // Handle text component
              if (!child.properties || typeof child.properties.text !== 'string') {
                console.warn(`Text component missing text property:`, child);
                failedComponents.push(`${child.type}`);
                continue;
              }

              const textNode = figma.createText();
              
              // Try to load font with fallback
              try {
                textNode.fontName = { family: "Inter", style: "Regular" };
                await figma.loadFontAsync(textNode.fontName);
              } catch (error) {
                console.warn('Failed to load Inter font, trying SF Pro Text:', error);
                try {
                  textNode.fontName = { family: "SF Pro Text", style: "Regular" };
                  await figma.loadFontAsync(textNode.fontName);
                } catch (fallbackError) {
                  console.warn('Failed to load fallback font:', fallbackError);
                }
              }
              
              let textContent = child.properties.text;
              
              textNode.characters = textContent;
              
              if (child.properties.fontSize) {
                textNode.fontSize = child.properties.fontSize;
              }
              if (child.properties.textAlign) {
                textNode.textAlignHorizontal = child.properties.textAlign;
              }
              
              textNode.textAutoResize = "HEIGHT";
              
              const maxTextWidth = contentFrame.width - 48;
              const initialWidth = child.layout && typeof child.layout.width === 'number'
                ? Math.min(child.layout.width, maxTextWidth)
                : maxTextWidth;
              
              textNode.resize(initialWidth, textNode.height);

              contentFrame.appendChild(textNode);
              renderedChildren.push(textNode);
              successfulComponents.push(`${child.type}`);
              continue;
            }

            if (!matchingComponent.key) {
              console.error(`Component missing key: ${child.type}${child.variant ? ` (${child.variant})` : ''}`);
              failedComponents.push(`${child.type}${child.variant ? ` (${child.variant})` : ''}`);
              continue;
            }

            try {
              const component = await figma.importComponentByKeyAsync(matchingComponent.key);
              const instance = component.createInstance();
              instance.name = child.id || `${child.type}${child.variant ? ` (${child.variant})` : ''}`;

              // Handle variant properties
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
                        (child: SceneNode) => child.name.toLowerCase() === format.toLowerCase()
                      );
                      if (matchingVariant) break;
                    }

                    if (matchingVariant) {
                      instance.mainComponent = matchingVariant as ComponentNode;
                    } else {
                      const defaultVariant = mainComponent.children.find(
                        (child: SceneNode) => 
                          child.name.toLowerCase().includes('default') || 
                          child.name.toLowerCase().includes('normal')
                      );
                      
                      if (defaultVariant) {
                        instance.mainComponent = defaultVariant as ComponentNode;
                      }
                    }
                  }
                } catch (variantError) {
                  console.error(`Variant error for ${child.type} (${child.variant}):`, variantError);
                }
              }

              // Set layout
              if (child.layout) {
                if (typeof child.layout.x === 'number') instance.x = child.layout.x;
                if (typeof child.layout.y === 'number') instance.y = child.layout.y;
                
                if (typeof child.layout.width === 'number' && typeof child.layout.height === 'number') {
                  safelyResizeNode(instance, child.layout.width, child.layout.height);
                }
              }

              // Handle component properties
              if (child.properties) {
                if (typeof child.properties.text === "string") {
                  const textNodes = instance.findAll((node) => node.type === "TEXT");
                  for (const node of textNodes) {
                    const textNode = node as TextNode;
                    try {
                      await figma.loadFontAsync(textNode.fontName as FontName);
                      textNode.characters = child.properties.text;
                    } catch (fontError) {
                      console.warn(`Failed to load font for text node:`, fontError);
                      try {
                        textNode.fontName = { family: "Inter", style: "Regular" };
                        await figma.loadFontAsync(textNode.fontName);
                        textNode.characters = child.properties.text;
                      } catch (fallbackError) {
                        console.warn(`Failed to load fallback font:`, fallbackError);
                      }
                    }
                  }
                }
                
                if (child.properties.fill) {
                  const fills = instance.findAll((node) => "fills" in node);
                  for (const node of fills) {
                    (node as GeometryMixin).fills = [{ type: 'SOLID', color: child.properties.fill }];
                  }
                }
              }

              contentFrame.appendChild(instance);
              renderedChildren.push(instance);
              successfulComponents.push(`${child.type}${child.variant ? ` (${child.variant})` : ''}`);
            } catch (error) {
              console.error(`Error rendering ${child.type}${child.variant ? ` (${child.variant})` : ''}:`, error);
              failedComponents.push(`${child.type}${child.variant ? ` (${child.variant})` : ''}`);
            }
          } catch (error) {
            console.error(`Error rendering ${child.type}${child.variant ? ` (${child.variant})` : ''}:`, error);
            failedComponents.push(`${child.type}${child.variant ? ` (${child.variant})` : ''}`);
          }
        }

        // Add the content frame to the main container
        container.appendChild(contentFrame);
        renderedChildren.push(contentFrame);
      }

      // Apply consistent spacing to all rendered children
      applyConsistentSpacing(container, renderedChildren);

      figma.currentPage.appendChild(container);
    }

    if (failedComponents.length === 0) {
      figma.notify("Successfully generated all components!");
    } else {
      figma.notify(
        `Generated ${successfulComponents.length} components. Failed: ${[
          ...new Set(failedComponents),
        ].join(", ")}`
      );
    }

    figma.ui.postMessage({
      type: "complete",
      success: true,
      stats: {
        successful: successfulComponents.length,
        failed: failedComponents.length,
      },
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

// Add a function to report progress
function reportProgress(stage: string, message: string) {
  figma.ui.postMessage({
    type: "progress",
    stage,
    message
  });
}
